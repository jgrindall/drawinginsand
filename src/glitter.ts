
import * as THREE from 'three';


let camera, scene, renderer, parameters, posAttr;
let mouseX = 0, mouseY = 0;

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const materials = [];

let m = {x:0, y:0}
let mouseDown = false

const width = 2000
const height = 1000

init();
animate();

function init() {

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 2000 );
	camera.position.z = 1000;

	scene = new THREE.Scene();

	const geometry = new THREE.BufferGeometry();
	const vertices = [];

	const textureLoader = new THREE.TextureLoader();

	const assignSRGB = ( texture ) => {

		texture.colorSpace = THREE.SRGBColorSpace;

	};

	const sprite1 = textureLoader.load( '/snowflake1.png', assignSRGB );


	for ( let i = 0; i < 10000; i ++ ) {

		const x = Math.random() * width - (width/2);
		const y = Math.random() * height - (height/2);
		const z = 0

		vertices.push( x, y, z );

	}

	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
	
	posAttr = geometry.getAttribute("position")
	posAttr.setUsage(THREE.DynamicDrawUsage)

	parameters = [

		[[ 0.90, 0.05, 0.5 ], sprite1, 60 ]
	];

	for ( let i = 0; i < parameters.length; i ++ ) {

		const color = parameters[ i ][ 0 ];
		const sprite = parameters[ i ][ 1 ];
		const size = parameters[ i ][ 2 ];

		materials[ i ] = new THREE.PointsMaterial( { size: size, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true } );
		materials[ i ].color.setHSL( color[ 0 ], color[ 1 ], color[ 2 ], THREE.SRGBColorSpace );

		const particles = new THREE.Points( geometry, materials[ i ] );

	
		scene.add( particles );

	}

	//

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	

	document.body.addEventListener( 'pointermove', onPointerMove );
	document.body.addEventListener( 'pointerdown', onPointerDown );
	document.body.addEventListener( 'pointerup', onPointerUp );

	//

	window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}



function mouseEventToRendererCoord(e: PointerEvent){
	const rect = renderer.domElement.getBoundingClientRect()

	// these are 0-1
	const x = (e.pageX - rect.left)/rect.width
	const y = (e.pageY - rect.top)/rect.height

	//these are -1 to 1
	return {
		x: 2*x - 1,
		y: -2*y + 1
	}
}

function onPointerMove( event ) {
	if(mouseDown){
		m = mouseEventToRendererCoord(event)
	}
}

function onPointerDown( event ) {
	mouseDown = true
}


function onPointerUp( event ) {
	mouseDown = false
}

function animate() {

	requestAnimationFrame( animate );

	render();


}



function render() {

	const time = Date.now() * 0.00005;

	for ( let i = 0; i < scene.children.length; i ++ ) {

		const object = scene.children[ i ];

		if ( object instanceof THREE.Points ) {

			//object.rotation.y = time * ( i < 4 ? i + 1 : - ( i + 1 ) );

		}

	}
	
	const d = 1000
	
	if(mouseDown){
		
		const m2 = {
			x:m.x * width/2,
			y:m.y * height/2
		}
		
		for ( let i = 0; i < 10000; i ++ ) {
		
			const x = posAttr.getX(i)
            const y = posAttr.getY(i)
			const z = posAttr.getZ(i)
			
			const dx = m2.x - x
			const dy = m2.y - y
			
			const dx2 = dx*dx
			const dy2 = dy*dy
			
			if(dx2 < 100 && dy2 < 100){
				const moveX = d/dx
				const moveY = d/dy
			
				posAttr.setXYZ(i, x + moveX, y + moveY, z)	
			}
			
			
		}
		
		posAttr.needsUpdate = true

		
	}
	
	
	
	
	
	

	renderer.render( scene, camera );

}