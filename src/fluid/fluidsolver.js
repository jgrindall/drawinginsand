/**
 * A Simple fluid solver implementation in javascript.
 *
 * Largely based on Jos Stam's paper "Real-Time Fluid Dynamics for Games".
 * @link https://www.dgp.toronto.edu/people/stam/reality/Research/pdf/GDC03.pdf
 *
 * Simulates the Navier–Stokes equations for incompressible fluids.
 * @link https://en.wikipedia.org/wiki/Navier-Stokes_equations
 *
 * @author Topaz Bar <topaz1008@gmail.com>
 */


import {Noise} from 'noisejs'

var noise = new Noise(Math.random())
export class FluidSolver {

    // Boundaries enumeration.
    static BOUNDARY_NONE = 0;
    static BOUNDARY_LEFT_RIGHT = 1;
    static BOUNDARY_TOP_BOTTOM = 2;

    /**
     * @param size {Number} Number of fluid cells for the simulation grid in each dimension (NxN)
     * @constructor
     */
    constructor(size, originalDensities) {
        this.size = size;

        this.originalSum = 0

        this.originalDensities = originalDensities

        this.oData = this.originalDensities.getContext("2d").getImageData(0, 0, this.size, this.size).data

        //0.0085


        this.dt = 0.00005; // The simulation time-step
        this.diffusion = 0.000000; // The amount of diffusion
        this.viscosity = 100; // The fluid's viscosity

        // Number of iterations to use in the Gauss-Seidel method in linearSolve()
        this.iterations = 2;

        this.doVorticityConfinement = true;

        // Two extra cells in each dimension for the boundaries
        this.numOfCells = (this.size + 2) * (this.size + 2);

        this.tmp = null; // Scratch space for references swapping

        // This might benefit from using typed arrays like Float32Array in some configuration.
        // But I haven't seen any significant improvement on Chrome because V8 probably does it on its own.

        // Values for current simulation step
        this.u = new Array(this.numOfCells); // Velocity x
        this.v = new Array(this.numOfCells); // Velocity y
        this.d = new Array(this.numOfCells); // Density

        // Values from the last simulation step
        this.uOld = new Array(this.numOfCells);
        this.vOld = new Array(this.numOfCells);
        this.dOld = new Array(this.numOfCells);

        this.curlData = new Array(this.numOfCells); // The cell's curl

        // Initialize everything

        this.originalSum = 0

        for (let i = 0; i < this.numOfCells; i++) {
            const density = this.getInitDValue(i)
            this.d[i] = density
            this.u[i] = this.v[i] = 0;
            this.dOld[i] = density
            this.uOld[i] = 0
            this.vOld[i] = 0;
            this.curlData[i] = 0;
            this.originalSum += density
        }
    }

    getInitDValue(i){
        // note: i goes from 0 to (n + 2) * (n + 2)
        let ix = Math.floor(i / (this.size + 2))
        let iy = i - ix*(this.size + 2)
        if(ix == 0 || ix == this.size + 1 || iy == 0 || iy == this.size + 1){
            //TODO or 1?
            return 0
        }
        ix -= 1
        iy -= 1
        let index = ix * this.size + iy
        index *= 4
        const r = this.oData[index]
        const g = this.oData[index + 1] 
        const b = this.oData[index + 2]
        const a = this.oData[index + 3]
        const avg = (r + g + b) / 3
        const value = avg * (a / 255)/ 255
        return 1 -  value
    }

    /**
     * Fluid cell indexing helper function.
     * (x | x) is a faster Math.floor(x)
     *
     * For public use.
     *
     * @return {number}
     * @public
     */
    I(i, j) {
        return (i | i) + (this.size + 2) * (j | j);
    }

    /**
     * Density step.
     */
    densityStep() {
        this.#addSource(this.d, this.dOld);

        this.#swapD();
        this.#diffuse(FluidSolver.BOUNDARY_NONE, this.d, this.dOld, this.diffusion);

        this.#swapD();
        this.#advect(FluidSolver.BOUNDARY_NONE, this.d, this.dOld, this.u, this.v);

        this.sum()
        
        // Reset for next step
        for (let i = 0; i < this.numOfCells; i++) {
            this.dOld[i] = this.getInitDValue(i);
        }


    }

    /**
     * Velocity step.
     */
    velocityStep() {
        this.#addSource(this.u, this.uOld);
        this.#addSource(this.v, this.vOld);

        if (this.doVorticityConfinement) {
            //this.#vorticityConfinement(this.uOld, this.vOld);
            //this.#addSource(this.u, this.uOld);
            //this.#addSource(this.v, this.vOld);
        }

        this.#swapU();
        this.#diffuse(FluidSolver.BOUNDARY_LEFT_RIGHT, this.u, this.uOld, this.viscosity);

        this.#swapV();
        this.#diffuse(FluidSolver.BOUNDARY_TOP_BOTTOM, this.v, this.vOld, this.viscosity);

        this.#project(this.u, this.v, this.uOld, this.vOld);
        this.#swapU();
        this.#swapV();

        this.#advect(FluidSolver.BOUNDARY_LEFT_RIGHT, this.u, this.uOld, this.uOld, this.vOld);
        this.#advect(FluidSolver.BOUNDARY_TOP_BOTTOM, this.v, this.vOld, this.uOld, this.vOld);

        this.#project(this.u, this.v, this.uOld, this.vOld);

        // Reset for next step
        for (let i = 0; i < this.numOfCells; i++) {
            this.uOld[i] = this.vOld[i] = 0;
        }
    }

    resetDensityUsing(canvas){
        
        return

        const context = canvas.getContext('2d')
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data

        console.log(data.length, this.size)

        

        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {

                let index = i + (this.size + 2) * j

                //console.log(index)


                const r = data[index] / 255
                const g = data[index + 1] / 255
                const b = data[index + 2] / 255
                const d = (r + g + b) / 3
                
                if( i <= 150 || j <= 150){
                    this.dOld[index] = r
                    this.d[index] = r
                }

                else{

                    this.dOld[index] = 0
                    this.d[index] = 0
                }
                
            }
        }
    }

    /**
     * Resets the density.
     */
    resetDensity() {
        /**
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                const index = this.I(i, j)
                const ti = i / this.size
                const tj = j / this.size
                const s = (1 + Math.sin(ti * 5 * Math.PI))/2
                const c = (1 + Math.cos(tj * 7 * Math.PI))/2
                this.d[index] = s * c
            }
        }
        **/

        for (let i = 0; i < this.numOfCells; i++) {
            this.d[i] = this.getInitDValue(i);
        }
    }

    /**
     * Resets the velocity.
     */
    resetVelocity() {
        for (let i = 0; i < this.numOfCells; i++) {
            // Set a small value, so we can render the velocity field
            this.v[i] = this.u[i] = 0.001;
        }
    }

    /**
     * Swap velocity x reference.
     * @private
     */
    #swapU() {
        this.tmp = this.u;
        this.u = this.uOld;
        this.uOld = this.tmp;
    }

    /**
     * Swap velocity y reference.
     * @private
     */
    #swapV() {
        this.tmp = this.v;
        this.v = this.vOld;
        this.vOld = this.tmp;
    }

    /**
     * Swap density reference.
     * @private
     */
    #swapD() {
        this.tmp = this.d;
        this.d = this.dOld;
        this.dOld = this.tmp;
    }

    /**
     * Integrate the density sources.
     *
     * @param x {Array<Number>}
     * @param s {Array<Number>}
     * @private
     */
    #addSource(x, s) {
        for (let i = 0; i < this.numOfCells; i++) {
            x[i] += s[i] * this.dt;
        }
    };

    /**
     * Calculate the curl at cell (i, j)
     * This represents the vortex strength at the cell.
     * Computed as: w = (del x U) where U is the velocity vector at (i, j).
     *
     * @param i Number
     * @param j {Number}
     * @return {Number}
     * @private
     */
    #curl(i, j) {
        const duDy = (this.u[this.I(i, j + 1)] - this.u[this.I(i, j - 1)]) * 0.5,
            dvDx = (this.v[this.I(i + 1, j)] - this.v[this.I(i - 1, j)]) * 0.5;

        return duDy - dvDx;
    }
    
    /**
     * Diffuse the density between neighbouring cells.
     *
     * @param b {Number}
     * @param x {Array<Number>}
     * @param x0 {Array<Number>}
     * @param diffusion {Number}
     * @private
     */
    #diffuse(b, x, x0, diffusion) {
        const a = 0
        //this.dt * diffusion * this.n * this.n;

        this.#linearSolve(b, x, x0, a, 1 + 4 * a);
    }

    sum(){
        let currentSum = 0
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                currentSum += this.d[this.I(i, j)]
            }
        }
        const delta = (currentSum - this.originalSum)/ this.numOfCells
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                this.d[this.I(i, j)] -= delta
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
                let x = i - dt0 * u[this.I(i, j)];
                let y = j - dt0 * v[this.I(i, j)];

                if (x < 0.5) x = 0.5;
                if (x > this.size + 0.5) x = this.size + 0.5;

                const i0 = (x | x);
                const i1 = i0 + 1;

                if (y < 0.5) y = 0.5;
                if (y > this.size + 0.5) y = this.size + 0.5;

                const j0 = (y | y);
                const j1 = j0 + 1;
                const s1 = x - i0;
                const s0 = 1 - s1;
                const t1 = y - j0;
                const t0 = 1 - t1;

                d[this.I(i, j)] = s0 * (t0 * d0[this.I(i0, j0)] + t1 * d0[this.I(i0, j1)]) +
                    s1 * (t0 * d0[this.I(i1, j0)] + t1 * d0[this.I(i1, j1)]);
            }
        }

        this.#setBoundary(b, d);
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
                div[this.I(i, j)] = -0.5 * h * (u[this.I(i + 1, j)] - u[this.I(i - 1, j)] +
                    v[this.I(i, j + 1)] - v[this.I(i, j - 1)]);

                p[this.I(i, j)] = 0;
            }
        }

        this.#setBoundary(FluidSolver.BOUNDARY_NONE, div);
        this.#setBoundary(FluidSolver.BOUNDARY_NONE, p);

        // Solve the Poisson equations
        this.#linearSolve(FluidSolver.BOUNDARY_NONE, p, div, 1, 4);

        // Subtract the gradient field from the velocity field to get a mass conserving velocity field.
        for (let i = 1; i <= this.size; i++) {
            for (let j = 1; j <= this.size; j++) {
                u[this.I(i, j)] -= 0.5 * (p[this.I(i + 1, j)] - p[this.I(i - 1, j)]) / h;
                v[this.I(i, j)] -= 0.5 * (p[this.I(i, j + 1)] - p[this.I(i, j - 1)]) / h;
            }
        }

        this.#setBoundary(FluidSolver.BOUNDARY_LEFT_RIGHT, u);
        this.#setBoundary(FluidSolver.BOUNDARY_TOP_BOTTOM, v);
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
                    x[this.I(i, j)] = (x0[this.I(i, j)] + a * (x[this.I(i - 1, j)] + x[this.I(i + 1, j)] +
                        x[this.I(i, j - 1)] + x[this.I(i, j + 1)])) * invC;
                }
            }

            this.#setBoundary(b, x);
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
            x[this.I(0, i)] = (b === FluidSolver.BOUNDARY_LEFT_RIGHT) ?
                -x[this.I(1, i)] : x[this.I(1, i)];

            x[this.I(this.size + 1, i)] = (b === FluidSolver.BOUNDARY_LEFT_RIGHT) ?
                -x[this.I(this.size, i)] : x[this.I(this.size, i)];

            x[this.I(i, 0)] = (b === FluidSolver.BOUNDARY_TOP_BOTTOM) ?
                -x[this.I(i, 1)] : x[this.I(i, 1)];

            x[this.I(i, this.size + 1)] = (b === FluidSolver.BOUNDARY_TOP_BOTTOM) ?
                -x[this.I(i, this.size)] : x[this.I(i, this.size)];
        }

        x[this.I(0, 0)] = 0.5 * (x[this.I(1, 0)] + x[this.I(0, 1)]);
        x[this.I(0, this.size + 1)] = 0.5 * (x[this.I(1, this.size + 1)] + x[this.I(0, this.size)]);
        x[this.I(this.size + 1, 0)] = 0.5 * (x[this.I(this.size, 0)] + x[this.I(this.size + 1, 1)]);
        x[this.I(this.size + 1, this.size + 1)] = 0.5 * (x[this.I(this.size, this.size + 1)] + x[this.I(this.size + 1, this.size)]);
    }
}
