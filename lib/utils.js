import Matrix from './Matrix';
import url from 'url';

import EXIF from 'exif-js';

export function getSlope (x0, y0, x1, y1) {
	if (Array.isArray(x0)) {
		[x0, y0, x1, y1] = x0;
	}
	return (y1 - y0) / (x1 - x0);
}


export function getDegrees (x0, y0, x1, y1) {
	if (Array.isArray(x0)) {
		[x0, y0, x1, y1] = x0;
	}

	let dx = (x1 - x0), dy = (y1 - y0);

	return Math.atan2(dy, dx) * 180 / Math.PI;
}


export function toRadians (degrees) {
	return (degrees % 360) * (Math.PI / 180);
}


export function toDegree (radians) {
	return Math.round((radians * 180) / Math.PI);
}


export function getDistance (x1, y1, x2, y2) {
	if (Array.isArray(x1)) {
		[x1, y1, x2, y2] = x1;
	}

	let dx = (x2 - x1), dy = (y2 - y1);

	return Math.sqrt(dx * dx + dy * dy);
}


export function canUse (image, fastOnCORS = true) {
	try {
		let p = url.parse(image.src);
		let cors = (p.hostname !== location.hostname || p.port !== location.port);
		if (p.protocol === 'data:' || !cors) {
			return true;
		}
		else if (fastOnCORS && cors) {
			return false;
		}

		let c = document.createElement('canvas');
		c.getContext('2d').drawImage(image, 0, 0);
		c.toDataURL();//default format, for speed.
		c.width = 0;//should free the buffer we just rendered
	}
	catch (e) {
		return false;
	}
	return true;
}


export function maybeProxyImage (src, image) {
	function passthrough() { image.src = src; }

	let tempImage = new Image();

	tempImage.onload = ()=>{
		if (!canUse(tempImage)) {
			image.src = proxyImage(src);
			return;
		}

		passthrough();
	};


	tempImage.onerror = ()=>{
		console.error('Could not load: ' + src);
		passthrough();
	};

	tempImage.src = src;
}


export function proxyImage (imageUrl) {
	if (/^data:/i.test(imageUrl)) {
		throw new Error('A data url was attempted to be proxied.');
	}

	return '/dataserver2/@@echo_image_url?image_url=' + encodeURIComponent(imageUrl);
}


export function toDataURL (img) {
	let src;
	if (/img/i.test(img.tagName)) {
		let c = document.createElement('canvas');

		c.width = img.naturalWidth || img.width;
		c.height = img.naturalHeight || img.height;

		c.getContext('2d').drawImage(img, 0, 0);

		src = c.toDataURL('image/png');

		c.width = 0;//should free the buffer we just rendered
	}
	else {
		src = img.toDataURL('image/png');
	}
	return src;
}


/**
 * Resample the current canvas. (modifies the canvas)
 *
 * Credit: https://github.com/viliusle/Hermite-resize
 *
 * @param  {CanvasElement} canvas The canvas to be resized.
 * @param  {Number} W	  Initial Width
 * @param  {Number} H	  Initial Height
 * @param  {Number} W2	 Desired Width
 * @param  {Number} H2	 Desired Height
 * @return {void}
 */
/*function hermite_resample(canvas, W, H, W2, H2){
	W2 = Math.round(W2);
	H2 = Math.round(H2);
	let start = Date.now();
	let context = canvas.getContext("2d");
	let img = context.getImageData(0, 0, W, H);
	let img2 = context.getImageData(0, 0, W2, H2);
	let data = img.data;
	let data2 = img2.data;
	let ratioW = W / W2;
	let ratioH = H / H2;
	let ratioWHalf = Math.ceil(ratioW / 2);
	let ratioHHalf = Math.ceil(ratioH / 2);

	for(let j = 0; j < H2; j++) {

		for(let i = 0; i < W2; i++) {
			let x2 = (i + j * W2) * 4;
			let weight = 0;
			let weights = 0;
			let weightsAlpha = 0;

			let gxR = 0,
				gxG = 0,
				gxB = 0,
				gxA = 0;

			let centerY = (j + 0.5) * ratioH;

			for(let yy = Math.floor(j * ratioH); yy < (j + 1) * ratioH; yy++) {

				let dy = Math.abs(centerY - (yy + 0.5)) / ratioHHalf;
				let centerX = (i + 0.5) * ratioW;
				let w0 = dy * dy; //pre-calc part of w

				for(let xx = Math.floor(i * ratioW); xx < (i + 1) * ratioW; xx++) {

					let dx = Math.abs(centerX - (xx + 0.5)) / ratioWHalf;
					let w = Math.sqrt(w0 + dx * dx);

					if(w >= -1 && w <= 1){
						//hermite filter
						weight = 2 * w * w * w - 3 * w * w + 1;
						if(weight > 0){
							dx = 4 * (xx + yy * W);
							//alpha
							gxA += weight * data[dx + 3];
							weightsAlpha += weight;
							//colors
							if(data[dx + 3] < 255) {
								weight = weight * data[dx + 3] / 250;
							}
							gxR += weight * data[dx];
							gxG += weight * data[dx + 1];
							gxB += weight * data[dx + 2];
							weights += weight;
						}
					}
				}
			}

			data2[x2]	 = gxR / weights;
			data2[x2 + 1] = gxG / weights;
			data2[x2 + 2] = gxB / weights;
			data2[x2 + 3] = gxA / weightsAlpha;
		}
	}
	console.log("hermite = " + (Math.round(Date.now() - start) / 1000)+" s");
	context.clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
	canvas.width = W2;
	canvas.height = H2;
	context.putImageData(img2, 0, 0);
}

function resample(image, width, height) {
	let cs = document.createElement('image');
	let ctx = cs.getContext('2d');
	let W = image.width;
	let H = image.height;
	Object.assign(cs, {width, height});

	ctx.drawImage(image, 0, 0, W, H);

	hermite_resample(cs, W, H, width, height);

	return cs;
}*/



function canvasScale(canvas, width, height) {
	//let start = new Date();
	let cs = document.createElement('canvas');
	let ctx = cs.getContext('2d');

	let W = canvas.width;
	let H = canvas.height;

	Object.assign(cs, {width, height});

	ctx.drawImage(canvas,	0, 0, W,		H,		//source
							0, 0, width,	height);//dest
	//console.log("canvas scale = " + (Math.round(Date.now() - start) / 1000)+" s");
	return cs;
}


function scaleImageDown(image, maxW, maxH) {
	let maxPixels = maxW * maxH;

	let {width, height} = image;

	let pixels = width * height;

	if (pixels < maxPixels) {
		return {
			width: width, height: height, src: (image.src || image.toDataURL('image/png'))
		};
	}

	let factor = maxPixels / pixels;
	let nw = width * factor;
	let nh = height * factor;

	//Now we want to create a new scaled image

	//let cs = resample(cs, nw, nh);
	let cs = canvasScale(image, nw, nh);

	return {
		width: nw,
		height: nh,
		src: cs.toDataURL('image/png')
	};
}


function buildCanvasFromImage (img) {

	let w = img.naturalWidth || img.width,
		h = img.naturalHeight || img.height,
		scale = 1 / w,
		wbCX, wbCY,
		m = new Matrix(),
		data = {
			shapeList: [],
			MimeType: 'application/vnd.nextthought.canvas',
			Class: 'Canvas',
			viewportRatio: (16 / 9)
		};

	wbCX = (scale * w) / 2;
	wbCY = (1 / data.viewportRatio) / 2;

	if (h > w || (h * scale) > (1 / data.viewportRatio)) {
		scale = (1 / data.viewportRatio) / h;
		wbCY = (scale * h) / 2;
		wbCX = 0.5;
	}

	m.translate(wbCX, wbCY);
	m.scale(scale);

	data.shapeList.push({
		MimeType: 'application/vnd.nextthought.canvasurlshape',
		Class: 'CanvasUrlShape',
		url: img.src || img.toDataURL('image/png'),
		transform: m.toTransform()
	});

	return data;
}


function flipImage (image) {
	let canvas = document.createElement('canvas');
	let context = canvas.getContext('2d');

	let {width, height} = image;
	Object.assign(canvas, {width, height});

	// translate context to center of canvas
	context.translate(canvas.width / 2, canvas.height / 2);

	// flip context horizontally
	context.scale(-1, 1);
	context.drawImage(image, -width / 2, -height / 2, width, height);
	return canvas;
}

function rotateImage (image, amount) {
	let canvas = document.createElement('canvas');
	let ctx = canvas.getContext("2d");
	let flippedDimensions = amount === 0 || amount === Math.PI;

	let {width, height} = image;

	if(flippedDimensions) {
		Object.assign(canvas, {width: height, height: width});
	} else {
		Object.assign(canvas, {width, height});
	}


	ctx.translate(canvas.width / 2, canvas.height / 2);

	ctx.rotate(amount);
	ctx.drawImage(image, -width / 2, -height / 2, width, height);
	return canvas;
}

function rotateImage90 (image) { return rotateImage(image, Math.PI / 2); }

function rotateImage180 (image) { return rotateImage(image, Math.PI); }

function rotateImage270 (image) { return rotateImage(image, (Math.PI * 3) / 2); }


//http://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/
function handleOrientation (img) {

	/*
	 * EXIF rotation transforms:
	 *
	 * 0: no op
	 * 1: no op
	 * 2: flip horizantal
	 * 3: rotate 180
	 * 4: rotate 180, flip horizantal
	 * 5: rotate 90, flip horizantal
	 * 6: rotate 90
	 * 7: rotate -90, flip horizantal
	 * 8: rotate -90
	 */

	let operations = {
		2: [flipImage],
		3: [rotateImage180],
		4: [rotateImage180, flipImage],
		5: [rotateImage90, flipImage],
		6: [rotateImage90],
		7: [rotateImage270, flipImage],
		8: [rotateImage270]
	};

	return new Promise(finish => {
		//(EXIF is manipulating the scope of the callback >.<)
		EXIF.getData(img, function(){ //so, cannot be an arrow function, nor a bound function.
			let orientation = EXIF.getTag(this, "Orientation");

			let work = operations[orientation];
			let output = img;

			if (!work) {
				return finish(img);
			}

			for (let task of work) {
				output = task(output);
			}

			// we don't bother converting the canvas to an image,
			// because canvas's can draw other canvas elements
			// just as if they were images
			finish(output);
		});
	});
}

export function createFromImage (img) {

	function enforceMaxSize(input, output) {
		let maxImgH = 1024,
			maxImgW = 768;

		try {
			output.src = scaleImageDown(input, maxImgW, maxImgH).src;
		}
		catch (er) {
			//If this happens... the server will need to scale on proxy.
			let proxy = new Image();
			proxy.onerror = ()=> output.onerror('bad_proxy');
			proxy.onload = ()=> output.src = scaleImageDown(proxy, maxImgW, maxImgH).src;
			proxy.src = proxyImage(img.src);
		}
	}


	return handleOrientation(img)
		.catch(er=> {
			console.error('No EXIF compensation: %o', er.stack || er.message || er);
			return img;
		})
		.then(orientedImage=>{

			return new Promise((finish, fail) => {
				let image = new Image();
				image.onerror = (e)=> fail(e || 'Hmm, there seems to be a problem with that image');
				image.onload = () => finish(buildCanvasFromImage(image));

				// image.src = orientedImage.src;
				enforceMaxSize(orientedImage, image);
			});
		});
}
