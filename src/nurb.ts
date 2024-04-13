
import * as THREE from 'three';
import { NURBSSurface } from 'three/examples/jsm/curves/NURBSSurface.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

console.log(NURBSSurface, ParametricGeometry)

var geometry, renderer, scene, camera, controls, clock, mesh

const container = document.getElementById( 'app' );

function init() {

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( window.devicePixelRatio );
    
	container.appendChild( renderer.domElement );

    scene = new THREE.Scene();
	
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
	directionalLight.position.set(0, 0, 6)
	directionalLight.lookAt(new THREE.Vector3(0, 0, 0))
	scene.add(directionalLight)
	scene.add(new THREE.AmbientLight(0xffffff, 0.3))


    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 1000 );
	
    camera.position.set( 0, 0, 100 );

    clock = new THREE.Clock();
    
    var nsControlPoints = [
      [
        new THREE.Vector4 ( -20, -20, 10, 1 ),
        new THREE.Vector4 ( -20, -10, -20, 1 ),
        new THREE.Vector4 ( -20, 10, 25, 1 ),
        new THREE.Vector4 ( -20, 20, -10, 1 )
      ],
      [
        new THREE.Vector4 ( 0, -20, 0, 1 ),
        new THREE.Vector4 ( 0, -10, -10, 5 ),
        new THREE.Vector4 ( 0, 10, 15, 5 ),
        new THREE.Vector4 ( 0, 20, 0, 1 )
      ],
      [
        new THREE.Vector4 ( 20, -20, -10, 1 ),
        new THREE.Vector4 ( 20, -10, 20, 1 ),
        new THREE.Vector4 ( 20, 10, -25, 1 ),
        new THREE.Vector4 ( 20, 20, 10, 1 )
      ]
    ];
    var degree1 = 2;
    var degree2 = 3;
    var knots1 = [0, 0, 0, 1, 1, 1];
    var knots2 = [0, 0, 0, 0, 1, 1, 1, 1];
    var nurbsSurface = new NURBSSurface(degree1, degree2, knots1, knots2, nsControlPoints);

    function getSurfacePoint(u, v, target) {

            return nurbsSurface.getPoint(u, v, target);

    }

    geometry = new ParametricGeometry( getSurfacePoint, 20, 20 );
	
	var material = new THREE.MeshStandardMaterial( {
		color: 0xffffff,
		side: THREE.DoubleSide
		} );
	
	//const geometry2 = new THREE.PlaneGeometry(3, 3, 1, 1)
    
	mesh = new THREE.Mesh( geometry, material );
	
	scene.add( mesh );
		
    geometry.attributes.position.setUsage( THREE.DynamicDrawUsage );

}

function draw(){
	 var position = geometry.attributes.position;
	
	const d = 0.001
    
    for ( var i = 0; i < position.count; i ++ ) {
		
	        var x = position.getX( i );
			var y = position.getY( i );
			var z = position.getZ( i );
			
			
	        //x += Math.sin( elapsedTime ) * 0.1 * i * d;
			//y += Math.sin( elapsedTime ) * 0.2 * i * d;
			z = 10
			
	        position.setXYZ(i, x, y, z);	
    }
		
    position.needsUpdate = true;
}

function animate() {

    requestAnimationFrame( animate );
	
	mesh.rotateX(0.0001)
	
	draw()
		
    var elapsedTime = clock.getElapsedTime();
	
    renderer.render( scene, camera );

}

init();
animate();