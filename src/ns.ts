
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { ToonShader1, ToonShader2, ToonShaderHatching, ToonShaderDotted } from 'three/addons/shaders/ToonShader.js';

let container;

let camera, scene, renderer;

let materials, current_material;

let light, pointLight, ambientLight;

let effect, resolution;
let effectController;


let time = 0;

const clock = new THREE.Clock();

init();
animate();

function init() {

	container = document.getElementById( 'app' );

	// CAMERA

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( - 500, 500, 1500 );

	// SCENE

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x050505 );

	// LIGHTS

	light = new THREE.DirectionalLight( 0xffffff, 3 );
	light.position.set( 0.5, 0.5, 1 );
	scene.add( light );

	pointLight = new THREE.PointLight( 0xff7c00, 3, 0, 0 );
	pointLight.position.set( 0, 0, 100 );
	scene.add( pointLight );

	ambientLight = new THREE.AmbientLight( 0x323232, 3 );
	scene.add( ambientLight );

	// MATERIALS

	materials = generateMaterials();
	current_material = 'plastic';

	// MARCHING CUBES

	resolution = 28;

	effect = new MarchingCubes( resolution, materials[ current_material ], true, true, 100000 );
	effect.position.set( 0, 0, 0 );
	effect.scale.set( 700, 700, 700 );

	effect.enableUvs = false;
	effect.enableColors = false;

	scene.add( effect );

	// RENDERER

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	// CONTROLS

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 500;
	controls.maxDistance = 5000;

	
	// GUI

	setupGui();

	// EVENTS

	window.addEventListener( 'resize', onWindowResize );

}

//

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function generateMaterials() {

	// environment map

	const path = 'textures/cube/SwedishRoyalCastle/';
	const format = '.jpg';
	const urls = [
		path + 'px' + format, path + 'nx' + format,
		path + 'py' + format, path + 'ny' + format,
		path + 'pz' + format, path + 'nz' + format
	];

	
	// toons

	const toonMaterial1 = createShaderMaterial( ToonShader1, light, ambientLight );
	const toonMaterial2 = createShaderMaterial( ToonShader2, light, ambientLight );
	const hatchingMaterial = createShaderMaterial( ToonShaderHatching, light, ambientLight );
	const dottedMaterial = createShaderMaterial( ToonShaderDotted, light, ambientLight );

	const texture = new THREE.TextureLoader().load( 'textures/uv_grid_opengl.jpg' );
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.colorSpace = THREE.SRGBColorSpace;

	const materials = {
		'plastic': new THREE.MeshPhongMaterial( { specular: 0xc1c1c1, shininess: 250 } )
	};

	return materials;

}

function createShaderMaterial( shader, light, ambientLight ) {

	const u = THREE.UniformsUtils.clone( shader.uniforms );

	const vs = shader.vertexShader;
	const fs = shader.fragmentShader;

	const material = new THREE.ShaderMaterial( { uniforms: u, vertexShader: vs, fragmentShader: fs } );

	material.uniforms[ 'uDirLightPos' ].value = light.position;
	material.uniforms[ 'uDirLightColor' ].value = light.color;

	material.uniforms[ 'uAmbientLightColor' ].value = ambientLight.color;

	return material;

}

//

function setupGui() {

	const createHandler = function ( id ) {

		return function () {

			current_material = id;

			effect.material = materials[ id ];
			effect.enableUvs = ( current_material === 'textured' ) ? true : false;
			effect.enableColors = ( current_material === 'colors' || current_material === 'multiColors' ) ? true : false;

		};

	};

	effectController = {

		material: 'plastic',

		speed: 1.0,
		numBlobs: 10,
		resolution: 28,
		isolation: 80,

		floor: true,
		wallx: false,
		wallz: false,

		dummy: function () {}

	};

	let h;

	
}

// this controls content of marching cubes voxel field

function updateCubes( object, time, numblobs, floor, wallx, wallz ) {

	object.reset();
	
	// fill the field with some metaballs

	const rainbow = [
		new THREE.Color( 0xff0000 ),
		new THREE.Color( 0xffbb00 ),
		new THREE.Color( 0xffff00 ),
		new THREE.Color( 0x00ff00 ),
		new THREE.Color( 0x0000ff ),
		new THREE.Color( 0x9400bd ),
		new THREE.Color( 0xc800eb )
	];
	const subtract = 12;
	const strength = 1.2 / ( ( Math.sqrt( numblobs ) - 1 ) / 4 + 1 );

	for ( let i = 0; i < numblobs; i ++ ) {

		const ballz = Math.cos( i + 1.32 * time * 0.1 * Math.sin( ( 0.92 + 0.53 * i ) ) ) * 0.27 + 0.5;
		
		const d = 0.1

		object.addBall( i*d, i*d, ballz, strength, subtract );

	}

	object.update();

}

//

function animate() {

	requestAnimationFrame( animate );

	render();

}

function render() {

	const delta = clock.getDelta();

	time += delta * effectController.speed * 0.5;

	// marching cubes

	if ( effectController.resolution !== resolution ) {

		resolution = effectController.resolution;
		effect.init( Math.floor( resolution ) );

	}

	if ( effectController.isolation !== effect.isolation ) {

		effect.isolation = effectController.isolation;

	}

	updateCubes( effect, time, effectController.numBlobs, effectController.floor, effectController.wallx, effectController.wallz );

	// render

	renderer.render( scene, camera );

}
