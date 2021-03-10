import url from 'url';

import EXIF from 'exif-js';

import Logger from '@nti/util-logger';

import Matrix from './Matrix';

const logger = Logger.get('lib:whiteboard:utils');

export const URL =
	global.URL && global.URL.createObjectURL
		? global.URL
		: global.webkitURL && global.webkitURL.createObjectURL
		? global.webkitURL
		: null;

const MAX_IMAGE_WIDTH = 1024;
const MAX_IMAGE_HEIGHT = 768;

function getWidth(img) {
	return img.naturalWidth || img.width;
}

function getHeight(img) {
	return img.naturalHeight || img.height;
}

function getDimensions(img) {
	return {
		width: getWidth(img),
		height: getHeight(img),
	};
}

function copyDimensions(from, to) {
	Object.assign(to, getDimensions(from));
}

export function getSlope(x0, y0, x1, y1) {
	if (Array.isArray(x0)) {
		[x0, y0, x1, y1] = x0;
	}
	return (y1 - y0) / (x1 - x0);
}

export function getDegrees(x0, y0, x1, y1) {
	if (Array.isArray(x0)) {
		[x0, y0, x1, y1] = x0;
	}

	const dx = x1 - x0,
		dy = y1 - y0;

	return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function toRadians(degrees) {
	return (degrees % 360) * (Math.PI / 180);
}

export function toDegree(radians) {
	return Math.round((radians * 180) / Math.PI);
}

export function getDistance(x1, y1, x2, y2) {
	if (Array.isArray(x1)) {
		[x1, y1, x2, y2] = x1;
	}

	const dx = x2 - x1,
		dy = y2 - y1;

	return Math.sqrt(dx * dx + dy * dy);
}

export function canUse(image, fastOnCORS = true) {
	try {
		const { location } = global;
		const p = url.parse(image.src);
		const cors =
			p.hostname !== location.hostname || p.port !== location.port;
		if (p.protocol === 'data:' || !cors) {
			return true;
		} else if (fastOnCORS && cors) {
			return false;
		}

		const c = document.createElement('canvas');
		const ctx = c.getContext('2d');
		ctx.drawImage(image, 0, 0);
		c.getImageData(0, 0, 1, 1);
		c.width = 0; //should free the buffer we just rendered
	} catch (e) {
		//if (e.code === 18) {
		return false;
		//}
	}
	return true;
}

export function maybeProxyImage(src, image) {
	function passthrough() {
		image.src = src;
	}

	let tempImage = new Image();

	tempImage.onload = () => {
		if (!canUse(tempImage)) {
			image.src = proxyImage(src);
			return;
		}

		passthrough();
	};

	tempImage.onerror = () => {
		logger.error('Could not load: ' + src);
		passthrough();
	};

	tempImage.src = src;
}

export function proxyImage(imageUrl) {
	if (/^data:/i.test(imageUrl)) {
		throw new Error('A data url was attempted to be proxied.');
	}

	return (
		'/dataserver2/@@echo_image_url?image_url=' +
		encodeURIComponent(imageUrl)
	);
}

export function toDataURL(img) {
	let src;
	if (/img/i.test(img.tagName)) {
		let c = document.createElement('canvas');

		copyDimensions(img, c);

		c.getContext('2d').drawImage(img, 0, 0);

		src = c.toDataURL('image/png');

		c.width = 0; //should free the buffer we just rendered
	} else {
		src = img.toDataURL('image/png');
	}
	return src;
}

function canvasScale(canvas, width, height) {
	//let start = new Date();
	let cs = document.createElement('canvas');
	let ctx = cs.getContext('2d');
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	let dim = getDimensions(canvas);
	let W = dim.width;
	let H = dim.height;

	Object.assign(cs, { width, height });

	ctx.mozImageSmoothingEnabled = true;
	ctx.webkitImageSmoothingEnabled = true;
	ctx.msImageSmoothingEnabled = true;
	ctx.imageSmoothingEnabled = true;

	ctx.drawImage(
		canvas,
		0,
		0,
		W,
		H, //source
		0,
		0,
		width,
		height
	); //dest
	//logger.debug("canvas scale = " + (Math.round(Date.now() - start) / 1000)+" s");
	return cs;
}

function scaleImageDown(image, maxW, maxH, transform) {
	let maxPixels = maxW * maxH;

	let { width, height } = getDimensions(image);

	let pixels = width * height;

	if (pixels < maxPixels) {
		if (transform) {
			let cs = canvasScale(image, width, height);
			cs = correctOrientation(cs, transform);

			return {
				width,
				height,
				src: toDataURL(cs),
			};
		}

		return image;
	}

	let factor = maxPixels / pixels;
	let nw = Math.floor(width * factor);
	let nh = Math.floor(height * factor);

	//Now we want to create a new scaled image

	//let cs = resample(cs, nw, nh);
	let cs = canvasScale(image, nw, nh);

	if (transform) {
		cs = correctOrientation(cs, transform);
	}

	return {
		width: nw,
		height: nh,
		src: toDataURL(cs),
	};
}

function buildCanvasFromImage(img) {
	let { width, height } = getDimensions(img);
	let ratio = width / height;
	let max = Math.max(width, height);

	let m = new Matrix();
	let data = {
		shapeList: [],
		MimeType: 'application/vnd.nextthought.canvas',
		Class: 'Canvas',
		viewportRatio: 16 / 9,
	};

	let tall = ratio < data.viewportRatio;

	let scale = 1 / (tall ? data.viewportRatio : 1) / max;

	let centerX = (tall ? 1 : scale * width) / 2;

	let centerY = (tall ? scale * height : 1 / data.viewportRatio) / 2;

	m.translate(centerX, centerY);
	m.scale(scale);

	let { src } = img.src;
	if (!src || /^blob/i.test(src)) {
		src = toDataURL(img);
	}

	data.shapeList.push({
		MimeType: 'application/vnd.nextthought.canvasurlshape',
		Class: 'CanvasUrlShape',
		url: src,
		transform: m.toTransform(),
	});

	return data;
}

function correctOrientation(image, transform) {
	let canvas = document.createElement('canvas');
	let ctx = canvas.getContext('2d');

	let flippedDimensions = (r => r !== 0 && r !== Math.PI)(
		transform.getRotation()
	);

	let { width, height } = image;

	if (flippedDimensions) {
		Object.assign(canvas, { width: height, height: width });
	} else {
		Object.assign(canvas, { width, height });
	}

	let m = new Matrix();

	m.translate(canvas.width / 2, canvas.height / 2);
	m.multiply(transform);

	m.applyTo(ctx);

	ctx.drawImage(
		image,
		0,
		0,
		width,
		height, //source
		-width / 2,
		-height / 2,
		width,
		height
	); //dest

	return canvas;
}

//http://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/
export function getOrientationTransform(img) {
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
		1: [0, false],
		2: [0, true],
		3: [Math.PI, false],
		4: [Math.PI, true],
		5: [Math.PI / 2, true],
		6: [Math.PI / 2, false],
		7: [(Math.PI * 3) / 2, true],
		8: [(Math.PI * 3) / 2, false],
	};

	return new Promise((finish, reject) => {
		//(EXIF is manipulating the scope of the callback >.<)
		EXIF.getData(img, function () {
			//so, cannot be an arrow function, nor a bound function.
			let orientation = EXIF.getTag(this, 'Orientation');

			let transform = operations[orientation];

			if (!transform) {
				return reject('Unknown: ' + (orientation || 'No EXIF'));
			}

			let [rotation, flip] = transform;

			transform = new Matrix();
			if (flip) {
				// flip context horizontally
				transform.scale(-1, 1);
			}

			transform.rotate(rotation);

			finish(transform);
		});
	});
}

export function createFromImage(img) {
	function enforceMaxSize(input, output, transform) {
		let X = MAX_IMAGE_WIDTH;
		let Y = MAX_IMAGE_HEIGHT;

		try {
			output.src = scaleImageDown(input, X, Y, transform).src;
		} catch (er) {
			//If this happens... the server will need to scale on proxy.
			let proxy = new Image();
			proxy.onerror = () => output.onerror('bad_proxy');
			proxy.onload = () =>
				(output.src = scaleImageDown(proxy, X, Y, transform).src);
			proxy.src = proxyImage(img.src);
		}
	}

	return getOrientationTransform(img)
		.catch(er => {
			logger.debug(
				'No EXIF compensation: %o',
				er.stack || er.message || er
			);
			return null;
		})
		.then(transform => {
			return new Promise((finish, fail) => {
				let image = new Image();
				image.onerror = e =>
					fail(
						e || 'Hmm, there seems to be a problem with that image'
					);
				image.onload = () => finish(buildCanvasFromImage(image));

				enforceMaxSize(img, image, transform);
			});
		});
}
