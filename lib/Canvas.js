import Circle from './shapes/Circle';
import Line from './shapes/Line';
import Path from './shapes/Path';
import Polygon from './shapes/Polygon';
import Text from './shapes/Text';
import Url from './shapes/Url';

const Blob = global.Blob || global.WebKitBlob || global.webkitBlob;

const SHAPES = {
	Circle, Line, Path, Polygon, Text, Url
};

const CANVAS_GOLDEN_RATIO = 1.6180; //http://en.wikipedia.org/wiki/Golden_ratio

const OBJECT_NAME = /^Canvas(.+?)Shape$/i;

// const CANVAS_URL_SHAPE_BROKEN_IMAGE = 'whiteboard-error-image';
// const CANVAS_BROKEN_IMAGE = 'whiteboard-broken-image';

function makeShape (data) {
	//reparent shapes
	let c = (OBJECT_NAME.exec(data.Class) || [])[1];
	if (!c) {
		console.warn('Not a shape: ' + JSON.stringify(data));
		return null;
	}

	if (c === 'Polygon' && data.sides <= 2) {
		c = 'Line';
	}

	let Shape = SHAPES[c];
	return Shape ? new Shape(data) : null;
}


function buildModelsFromData (scene) {
	let drawData = Object.assign({}, scene || {shapeList: []});

	drawData.shapeList = drawData.shapeList.slice();

	//maintain z-order since we're looping backwards (for speed)
	drawData.shapeList.reverse();

	let shapes = drawData.shapeList;
	let i = shapes.length - 1;

	for (i; i >= 0; i--) {
		let o = shapes[i];
		shapes[i] = o && makeShape(o);
	}

	return drawData;
}


function drawScene (data, canvas, finished) {
	let c = canvas,
		w = canvas.offsetWidth || canvas.width,
		h = canvas.offsetHeight || canvas.height,
		shapes = data.shapeList || [],
		i = shapes.length - 1;

	//reset context
	c.width = 1; c.width = w;
	c.height = h;

	let ctx = c.getContext('2d');

	ctx.save();
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, w, h);
	ctx.restore();


	(function next (x, cb) {
		if (x < 0) {
			if (cb && cb.call) {
				cb();
			}
			return;
		}

		ctx.save();
		shapes[x].draw(ctx, () => {
			ctx.restore();
			next(x - 1, cb);
		});

	}(i, finished));
}


export default class Canvas {

	constructor (data, el = null) {
		this.el = el || document.createElement('canvas');
		this.updateData(data);
	}


	updateData (scene) {
		this.scene = buildModelsFromData(scene);

		if (scene && scene.viewportRatio) {
			this.viewportRatio = scene.viewportRatio;
		}
		else {
			this.viewportRatio = CANVAS_GOLDEN_RATIO;   //Default to this for new shapes.
		}
	}


	getData () {
		if (!this.scene) {
			return null;
		}

		let data = {},
			shapes = this.scene.shapeList;

		data.shapeList	= [];
		data.MimeType	= 'application/vnd.nextthought.canvas';
		data.Class	= 'Canvas';
		data.viewportRatio = this.viewportRatio;
		data.NTIID = this.scene.NTIID;

		for (let i = shapes.length - 1; i >= 0; i--) {
			data.shapeList.push(shapes[i].getJSON());
		}

		return data;
	}


	setSize (width, height, redraw = true) {
		height = Math.round(width / (this.viewportRatio || 1));

		Object.assign(this.el, { width, height });

		if (redraw) {
			setTimeout(()=>this.drawScene(), 1);
		}
	}


	drawScene () {
		if (!this.scene) {
			return Promise.reject('No Scene to draw');
		}

		if (this.drawing) {
			return this.drawing
				.catch((e)=>console.warn(e))
				.then(()=>this.drawScene());
			// return Promise.reject('Cannot begin drawing while already drawing.');
		}

		this.drawing = new Promise(finish => {
			drawScene(this.scene, this.el, () => {
				delete this.drawing;
				finish(this);
			});
		});

		return this.drawing;
	}


	addShape (shape) {
		this.scene.shapeList.unshift(shape);
	}


	toDataURL (format = 'image/png') {
		return this.el.toDataURL(format);
	}


	toBlob (type = 'image/png') {
		let {el} = this;
		return new Promise(finish=> {

			if (el.toBlob) {
				return el.toBlob(finish, type);
			}

			let binStr = atob( this.toDataURL(type).split(',')[1] ),
				len = binStr.length,
				arr = new Uint8Array(len);

			for (let i = len - 1; i >= 0; i-- ) {
				arr[i] = binStr.charCodeAt(i);
			}

			finish( new Blob( [arr], {type} ) );
		});
	}


	static getThumbnail (scene, asBlob = true) {
		let c = new this(scene);
		c.setSize(512, 512 / (scene.viewportRatio || 1), false);
		return c.drawScene().then(()=> asBlob ? c.toBlob() : c.toDataURL('image/jpeg'));
	}
}
