import Matrix from './Matrix';
import url from 'url';

const USE_DATA_URLS = false;


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
		c.toDataURL('image/png');
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


export function toDataUrl (img) {

	let c = document.createElement('canvas');

	c.width = img.naturalWidth || img.width;
	c.height = img.naturalHeight || img.height;

	c.getContext('2d').drawImage(img, 0, 0);

	let src = c.toDataURL('image/png');

	c.width = 0;//should free the buffer we just rendered

	return src;
}


/**
 * Resample the current canvas.
 *
 * Credit: https://github.com/viliusle/Hermite-resize
 *
 * @param  {CanvasElement} canvas The canvas to be resized.
 * @param  {Number} W      Initial Width
 * @param  {Number} H      Initial Height
 * @param  {Number} W2     Desired Width
 * @param  {Number} H2     Desired Height
 * @return {void}
 */
function resample(canvas, W, H, W2, H2){
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


function scaleImageDown(image, maxW, maxH) {
	let aspectRatio = 1.0,
		nw, nh,
		cs = document.createElement('canvas'),
		ctx = cs.getContext('2d');

	let width = image.width;
	let height = image.height;

	if (maxW >= width && maxH >= height) {
		return {
			width: width, height: height, src: image.src
		};
	}

	if (width > height) {
		aspectRatio = width / height;
		nw = maxW;
		nh = Math.round(maxH / aspectRatio);
	}
	else {
		aspectRatio = height / width;
		nw = Math.round(maxW / aspectRatio);
		nh = maxH;
	}

	//Now we want to create a new scaled image
	cs.width = width;
	cs.height = height;
	ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);

	resample(cs, width, height, nw, nh);

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
		Class: 'CanvasUrlShape',
		url: img.src,
		transform: m.toTransform()
	});

	return data;
}


export function createFromImage (img, forceDataUrl) {
	let useClonedImage = forceDataUrl || USE_DATA_URLS;

	function requestDataURL(image) {
		let maxImgH = 1024,
			maxImgW = 768;

		try {
			image.src = scaleImageDown(img, maxImgW, maxImgH).src;
		}
		catch (er) {
			//If this happens... the server will need to scale on proxy.
			let proxy = new Image();
			proxy.onerror = ()=> image.onerror('bad_proxy');
			proxy.onload = ()=> image.src = toDataUrl(proxy);
			proxy.src = proxyImage(img.src);
		}
	}

	return new Promise((finish, fail) => {

		if (useClonedImage === true) {
			let image = new Image();
			image.onerror = (e)=> fail(e || 'Hmm, there seems to be a problem with that image');
			image.onload = () => finish(buildCanvasFromImage(image));

			return requestDataURL(image);
		}

		finish(buildCanvasFromImage(img));
	});

}
