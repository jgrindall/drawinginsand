
import {Noise} from 'noisejs'

const noise = new Noise(Math.random())
export class FluidSolver {

    // Boundaries enumeration.
    static BOUNDARY_NONE = 0
    static BOUNDARY_LEFT_RIGHT = 1
    static BOUNDARY_TOP_BOTTOM = 2

    /**
     * @param size {Number} Number of fluid cells for the simulation grid in each dimension (NxN)
     * @constructor
     */
    constructor(size, originalDensityCanvas) {
        this.size = size

        this.originalDensityData = originalDensityCanvas
            .getContext("2d")
            .getImageData(0, 0, this.size, this.size)
            .data

        this.dt = 0.00005
        this.diffusion = 0
        this.viscosity = 100

        // Number of iterations to use in the Gauss-Seidel method in linearSolve()
        this.iterations = 2

        // Two extra cells in each dimension for the boundaries
        this.cellCount = (this.size + 2) * (this.size + 2)

        this.tmp = null; // Scratch space for references swapping

        // Values for current simulation step
        this.u = new Array(this.cellCount) // Velocity x
        this.v = new Array(this.cellCount) // Velocity y
        this.d = new Array(this.cellCount) // Density

        // Values from the last simulation step
        this.uOld = new Array(this.cellCount)
        this.vOld = new Array(this.cellCount)
        this.dOld = new Array(this.cellCount)

        // Initialize everything

        this.originalDensitySum = 0

        for (let i = 0; i < this.cellCount; i++) {
            const density = this.getInitialDensityAtIndex(i)
            this.d[i] = density
            this.u[i] = 0
            this.v[i] = 0
            this.dOld[i] = density
            this.uOld[i] = 0
            this.vOld[i] = 0;
            this.originalDensitySum += density
        }
    }

    getInitialDensityAtIndex(i){
        // note: i goes from 0 to (n + 2) * (n + 2)
        let ix = Math.floor(i / (this.size + 2))
        let iy = i - ix*(this.size + 2)
        if(ix == 0 || ix == this.size + 1 || iy == 0 || iy == this.size + 1){
            //TODO or 1?
            return 0
        }
        ix -= 1
        iy -= 1
        const index = 4*(ix * this.size + iy)
        const r = this.originalDensityData[index]
        const g = this.originalDensityData[index + 1] 
        const b = this.originalDensityData[index + 2]
        const a = this.originalDensityData[index + 3]
        const avg = (r + g + b) / 3
        const value = avg * (a / 255) / 255
        return 1 -  value
    }

    /**
     * @return {number}
     * @public
     */
    getArrayIndex(i, j) {
        return i + (this.size + 2) * j
    }

    /**
     * Density step.
     */
    densityStep() {
        this.#addSource(this.d, this.dOld)

        this.#swapD();
        this.#diffuse(FluidSolver.BOUNDARY_NONE, this.d, this.dOld, this.diffusion)

        this.#swapD();
        this.#advect(FluidSolver.BOUNDARY_NONE, this.d, this.dOld, this.u, this.v)

        this.sum()
        
        // Reset for next step
        for (let i = 0; i < this.cellCount; i++) {
            this.dOld[i] = this.getInitialDensityAtIndex(i)
        }

    }

    /**
     * Velocity step.
     */
    velocityStep() {
        this.#addSource(this.u, this.uOld)
        this.#addSource(this.v, this.vOld)

        this.#swapU()
        this.#diffuse(FluidSolver.BOUNDARY_LEFT_RIGHT, this.u, this.uOld, this.viscosity)

        this.#swapV()
        this.#diffuse(FluidSolver.BOUNDARY_TOP_BOTTOM, this.v, this.vOld, this.viscosity)

        this.#project(this.u, this.v, this.uOld, this.vOld)
        this.#swapU()
        this.#swapV()

        this.#advect(FluidSolver.BOUNDARY_LEFT_RIGHT, this.u, this.uOld, this.uOld, this.vOld)
        this.#advect(FluidSolver.BOUNDARY_TOP_BOTTOM, this.v, this.vOld, this.uOld, this.vOld)

        this.#project(this.u, this.v, this.uOld, this.vOld)

        // Reset for next step
        for (let i = 0; i < this.cellCount; i++) {
            this.uOld[i] = 0
            this.vOld[i] = 0
        }
    }

    /**
     * Resets the density.
     */
    resetDensity() {
        for (let i = 0; i < this.cellCount; i++) {
            this.d[i] = this.getInitialDensityAtIndex(i)
        }
    }

    /**
     * Resets the velocity.
     */
    resetVelocity() {
        for (let i = 0; i < this.cellCount; i++) {
            // Set a small value, so we can render the velocity field
            this.v[i] = 0
            this.u[i] = 0
        }
    }

    /**
     * Swap velocity x reference.
     * @private
     */
    #swapU() {
        this.tmp = this.u
        this.u = this.uOld
        this.uOld = this.tmp
    }

    /**
     * Swap velocity y reference.
     * @private
     */
    #swapV() {
        this.tmp = this.v
        this.v = this.vOld
        this.vOld = this.tmp
    }

    /**
     * Swap density reference.
     * @private
     */
    #swapD() {
        this.tmp = this.d
        this.d = this.dOld
        this.dOld = this.tmp
    }

    /**
     * Integrate the density sources.
     *
     * @param x {Array<Number>}
     * @param s {Array<Number>}
     * @private
     */
    #addSource(x, s) {
        for (let i = 0; i < this.cellCount; i++) {
            x[i] += s[i] * this.dt
        }
    };
    
    /**
     * Diffuse the density between neighbouring cells.
     *
     * @param b {Number}
     * @param x {Array<Number>}
     * @param x0 {Array<Number>}
     * @private
     */
    #diffuse(b, x, x0) {
        const a = 0
        this.#linearSolve(b, x, x0, a, 1 + 4 * a)
    }

    sum(){
        let currentSum = 0
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                currentSum += this.d[this.getArrayIndex(i, j)]
            }
        }
        const delta = (currentSum - this.originalDensitySum)/ this.cellCount
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                this.d[this.getArrayIndex(i, j)] -= delta
            }
        }
    }

    /**
     * The advection step moves the density through the static velocity field.
     * Instead of moving the cells forward in time, we treat the cell's center as a particle
     * and then trace it back in time to look for the 'particles' which end up at the cell's center.
     *
     * @param b {Number}
     * @param d {Array<Number>}
     * @param d0 {Array<Number>}
     * @param u {Array<Number>}
     * @param v {Array<Number>}
     * @private
     */
    #advect(b, d, d0, u, v) {
        const dt0 = this.dt * this.size;
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                let x = i - dt0 * u[this.getArrayIndex(i, j)]
                let y = j - dt0 * v[this.getArrayIndex(i, j)]

                if (x < 0.5) x = 0.5
                if (x > this.size + 0.5) x = this.size + 0.5

                const i0 = (x | x)
                const i1 = i0 + 1

                if (y < 0.5) y = 0.5
                if (y > this.size + 0.5) y = this.size + 0.5

                const j0 = (y | y)
                const j1 = j0 + 1
                const s1 = x - i0
                const s0 = 1 - s1
                const t1 = y - j0
                const t0 = 1 - t1

                d[this.getArrayIndex(i, j)] = s0 * (t0 * d0[this.getArrayIndex(i0, j0)] + t1 * d0[this.getArrayIndex(i0, j1)]) +
                    s1 * (t0 * d0[this.getArrayIndex(i1, j0)] + t1 * d0[this.getArrayIndex(i1, j1)])
            }
        }

        this.#setBoundary(b, d)
    }

    /**
     * Forces the velocity field to be mass conserving.
     * This step is what actually produces the nice looking swirly vortices.
     *
     * It uses a result called Hodge Decomposition which says that every velocity field is the sum
     * of a mass conserving field, and a gradient field. So we calculate the gradient field, and subtract
     * it from the velocity field to get a mass conserving one.
     * It solves a linear system of equations called Poisson Equation.
     *
     * @param u {Array<Number>}
     * @param v {Array<Number>}
     * @param p {Array<Number>}
     * @param div {Array<Number>}
     * @private
     */
    #project(u, v, p, div) {
        // Calculate the gradient field
        const h = 1.0 / this.size;
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                div[this.getArrayIndex(i, j)] = -0.5 * h * (u[this.getArrayIndex(i + 1, j)] - u[this.getArrayIndex(i - 1, j)] +
                    v[this.getArrayIndex(i, j + 1)] - v[this.getArrayIndex(i, j - 1)])

                p[this.getArrayIndex(i, j)] = 0
            }
        }

        this.#setBoundary(FluidSolver.BOUNDARY_NONE, div)
        this.#setBoundary(FluidSolver.BOUNDARY_NONE, p)

        // Solve the Poisson equations
        this.#linearSolve(FluidSolver.BOUNDARY_NONE, p, div, 1, 4)

        // Subtract the gradient field from the velocity field to get a mass conserving velocity field.
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                u[this.getArrayIndex(i, j)] -= 0.5 * (p[this.getArrayIndex(i + 1, j)] - p[this.getArrayIndex(i - 1, j)]) / h
                v[this.getArrayIndex(i, j)] -= 0.5 * (p[this.getArrayIndex(i, j + 1)] - p[this.getArrayIndex(i, j - 1)]) / h
            }
        }

        this.#setBoundary(FluidSolver.BOUNDARY_LEFT_RIGHT, u)
        this.#setBoundary(FluidSolver.BOUNDARY_TOP_BOTTOM, v)
    }

    /**
     * Solve a linear system of equations using Gauss-Seidel method.
     *
     * @param b {Number}
     * @param x {Array<Number>}
     * @param x0 {Array<Number>}
     * @param a {Number}
     * @param c {Number}
     * @private
     */
    #linearSolve(b, x, x0, a, c) {
        const invC = 1.0 / c;

        for (let k = 0; k < this.iterations; k++) {
            for (let i = 1; i <= this.size; i++) {
                for (let j = 1; j <= this.size; j++) {
                    x[this.getArrayIndex(i, j)] = (x0[this.getArrayIndex(i, j)] + a * (x[this.getArrayIndex(i - 1, j)] + x[this.getArrayIndex(i + 1, j)] +
                        x[this.getArrayIndex(i, j - 1)] + x[this.getArrayIndex(i, j + 1)])) * invC
                }
            }

            this.#setBoundary(b, x)
        }
    }

    /**
     * Set boundary conditions.
     *
     * @param b {Number}
     * @param x {Array<Number>}
     * @private
     */
    #setBoundary(b, x) {
        for (let i = 1; i <= this.size; i++) {
            x[this.getArrayIndex(0, i)] = (b === FluidSolver.BOUNDARY_LEFT_RIGHT) ?
                -x[this.getArrayIndex(1, i)] : x[this.getArrayIndex(1, i)]

            x[this.getArrayIndex(this.size + 1, i)] = (b === FluidSolver.BOUNDARY_LEFT_RIGHT) ?
                -x[this.getArrayIndex(this.size, i)] : x[this.getArrayIndex(this.size, i)]

            x[this.getArrayIndex(i, 0)] = (b === FluidSolver.BOUNDARY_TOP_BOTTOM) ?
                -x[this.getArrayIndex(i, 1)] : x[this.getArrayIndex(i, 1)]

            x[this.getArrayIndex(i, this.size + 1)] = (b === FluidSolver.BOUNDARY_TOP_BOTTOM) ?
                -x[this.getArrayIndex(i, this.size)] : x[this.getArrayIndex(i, this.size)]
        }

        x[this.getArrayIndex(0, 0)] = 0.5 * (x[this.getArrayIndex(1, 0)] + x[this.getArrayIndex(0, 1)])
        x[this.getArrayIndex(0, this.size + 1)] = 0.5 * (x[this.getArrayIndex(1, this.size + 1)] + x[this.getArrayIndex(0, this.size)])
        x[this.getArrayIndex(this.size + 1, 0)] = 0.5 * (x[this.getArrayIndex(this.size, 0)] + x[this.getArrayIndex(this.size + 1, 1)])
        x[this.getArrayIndex(this.size + 1, this.size + 1)] = 0.5 * (x[this.getArrayIndex(this.size, this.size + 1)] + x[this.getArrayIndex(this.size + 1, this.size)])
    }
}
