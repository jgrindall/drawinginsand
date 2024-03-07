import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
	EdgesHelper,
	TriangleSetHelper,
	Brush,
	Evaluator,
	SUBTRACTION,
} from 'three-bvh-csg';

let renderer, camera, scene, gui;
let controls;
let brush1, brush2, brush1_w;
let resultObject, light;
let edgesHelper, trisHelper, trisHelper2;
let needsUpdate = true;
let csgEvaluator;

init();

async function init() {
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.outputEncoding = THREE.sRGBEncoding;
	document.body.appendChild( renderer.domElement );

	renderer.setAnimationLoop( render );

	// scene setup
	scene = new THREE.Scene();

	// lights
	light = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.set( - 1, 2, 3 );
	scene.add( light, light.target );
	scene.add( new THREE.AmbientLight( 0xb0bec5, 0.1 ) );

	// camera setup
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	camera.position.set( 1, 2, 4 );
	camera.far = 100;
	camera.updateProjectionMatrix();

	// controls
	controls = new OrbitControls( camera, renderer.domElement );

	

	csgEvaluator = new Evaluator();
	csgEvaluator.attributes = [ 'position' ];

	brush1 = new Brush( new THREE.BoxGeometry(), new THREE.MeshBasicMaterial() );
	brush2 = new Brush( new THREE.BoxGeometry(), new THREE.MeshBasicMaterial() );
	brush2.position.set( - 0.0, 0.75, 0 );
	brush2.scale.setScalar( 0.75 );
	brush2.rotation.x=-Math.PI/2 - Math.PI/4;
	brush2.position.z=0.2;

	updateBrush( brush1, "box", 12, 12, 0.5);
	updateBrush( brush2, "box", 1, 1, 1);

	// initialize materials
	brush1.material.opacity = 0.15;
	brush1.material.transparent = true;
	brush1.material.side = THREE.DoubleSide;

	brush2.material.opacity = 0.15;
	brush2.material.transparent = true;
	brush2.material.side = THREE.DoubleSide;
	brush2.material.wireframe = true;
	brush2.material.color.set( 0xE91E63 ).convertSRGBToLinear();

	brush1_w = new Brush( new THREE.BoxGeometry(), new THREE.MeshBasicMaterial() );
	brush1_w.material.opacity = 0.15;
	brush1_w.material.transparent = true;
	brush1_w.material.side = THREE.DoubleSide;
	brush1_w.material.wireframe = true;
	scene.add( brush1_w );
	scene.add( brush1 );

	// add object displaying the result
	resultObject = new THREE.Mesh( new THREE.BufferGeometry(), new THREE.MeshBasicMaterial() );

	// helpers
	edgesHelper = new EdgesHelper()
	edgesHelper.color.set( 0x00ffff ).convertSRGBToLinear()
	scene.add( edgesHelper )

	trisHelper = new TriangleSetHelper()
	trisHelper.color.set( 0x00BCD4 ).convertSRGBToLinear()
	scene.add( trisHelper )

	trisHelper2 = new TriangleSetHelper()
	trisHelper2.color.set( 0xD4BC00 ).convertSRGBToLinear()
	scene.add( trisHelper2 )
}


function updateBrush( brush, type, v1, v2, v3 ) {

	brush.geometry.dispose();
	brush.geometry = new THREE.BoxGeometry( v1, v2, v3 );
	
	brush.geometry = brush.geometry.toNonIndexed();
	needsUpdate = true;
}

function render() {

	brush1.updateMatrixWorld(true);
	brush1_w.updateMatrixWorld(true);
	brush2.updateMatrixWorld(true);

	if ( needsUpdate ) {

		needsUpdate = false;

		csgEvaluator.debug.enabled = true;
		csgEvaluator.useGroups = true;
		csgEvaluator.evaluate( brush1, brush2, SUBTRACTION, resultObject );

		let check_geom = resultObject.geometry.clone();
		check_geom.attributes.position.array.slice(check_geom.drawRange.start*3, check_geom.drawRange.count*3);
		check_geom.attributes.position.count = check_geom.drawRange.count;
		brush1.geometry = check_geom;
		brush1_w.geometry = check_geom;

		edgesHelper.setEdges( csgEvaluator.debug.intersectionEdges );
		
	}

	renderer.render( scene, camera );
}

window.addEventListener('resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}, false);

window.addEventListener( 'keydown', function ( e ) {
	switch ( e.code ) {
		case 'ArrowLeft':
			brush2.position.x -= 0.025;
			needsUpdate = true;
			break;
		case 'ArrowRight':
			brush2.position.x += 0.025;
			needsUpdate = true;
			break;
		case 'ArrowUp':
			brush2.position.y += 0.025;
			needsUpdate = true;
			break;
		case 'ArrowDown':
			brush2.position.y -= 0.025;
			needsUpdate = true;
			break;
		case 'KeyU':
			needsUpdate = true;
			break;
	}
});