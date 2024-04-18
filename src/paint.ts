const VIEW_SIZE = 512

const canvas = document.getElementById('main-canvas');
const context = canvas!.getContext('2d');

canvas!.width = canvas!.height = VIEW_SIZE;

const img = new Image();
img.src = '/paint.jpg';
img.onload = () => {
	  context!.drawImage(img, 0, 0, img.width, img.height, 0, 0, VIEW_SIZE, VIEW_SIZE);
}