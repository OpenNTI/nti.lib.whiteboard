import Matrix from './Matrix';

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


export function canUse (image) {
	try {
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


export function maybeProxyImage (url, image) {
	function passthrough() { image.src = url; }

	let tempImage = new Image();

	tempImage.onload = ()=>{
		if (!canUse(tempImage)) {
			image.src = proxyImage(url);
			return;
		}

		passthrough();
	};


	tempImage.onerror = ()=>{
		console.error('Could not load: ' + url);
		passthrough();
	};

	tempImage.src = url;
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

	let url = c.toDataURL('image/png');

	c.width = 0;//should free the buffer we just rendered

	return url;
}


export function buildCanvasFromImage (img) {
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


export function createFromImage (img, cb, forceDataUrl) {
	let useClonedImage = forceDataUrl || USE_DATA_URLS;

	function error() {
		console.error('Hmm, there seems to be a problem with that image');
	}


	function requestDataURL(image) {
		try {
			image.src = toDataUrl(img);
		}
		catch (er) {
			let proxy = new Image();
			proxy.onerror = ()=> error('bad_proxy');
			proxy.onload = ()=> image.src = toDataUrl(proxy);
			proxy.src = proxyImage(img.src);
		}
	}


	if (useClonedImage === true) {
		let image = new Image();
		image.onerror = error;
		image.onload = () => cb && setTimeout(()=>cb(buildCanvasFromImage(image)), 1);

		requestDataURL(image);
	}
	else if (cb){
		setTimeout(()=>cb(buildCanvasFromImage(img)), 1);
	}

}
