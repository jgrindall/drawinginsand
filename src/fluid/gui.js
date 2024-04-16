
export class AppGUI {
    static CONTAINER_ELEMENT_ID = 'gui-container';

    #gui = null;
    #appOptions = null;
    #fluidSolver = null;

    constructor(GUI, guiOptions, appOptions) {
        this.#gui = new GUI(guiOptions);
        this.#appOptions = appOptions;
        this.#fluidSolver = appOptions.fluidSolver;
    }

    init() {
        this.#gui.add(this.#fluidSolver, 'dt', 0.0, 0.5).step(0.00001).name('Time Step');
        this.#gui.add(this.#fluidSolver, 'iterations', 1, 10).step(1).name('Solver Iterations');
        this.#gui.add(this.#fluidSolver, 'diffusion', 0.0, 0.001).step(0.00001).name('Diffusion');

        const viscosities = {
            None: 0,
            'Very Low': 1 / 100000,
            Low: 1 / 5000,
            High: 1 / 1000,
            vHigh: 1 / 100,
            vvHigh: 1 / 10,
            vvvHigh: 1 / 3,
            vvvvHigh: 2,
            vvvvvHigh: 20,
            vvvvvvHigh: 200
        };
        this.#gui.add(this.#fluidSolver, 'viscosity', viscosities).name('Viscosity');

        this.#gui.add(this.#fluidSolver, 'doVorticityConfinement').name('Vorticity Confinement');

        this.#gui.add(this.#appOptions, 'grayscale').name('Grayscale');
        

        this.#gui.add(this.#fluidSolver, 'resetDensity').name('Reset Density');


        document.getElementById(AppGUI.CONTAINER_ELEMENT_ID)
            .appendChild(this.#gui.domElement);
    }
}
