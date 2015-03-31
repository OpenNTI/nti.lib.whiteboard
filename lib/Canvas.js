import Circle from './shapes/Circle';
import Line from './shapes/Line';
import Path from './shapes/Path';
import Polygon from './shapes/Polygon';
import Text from './shapes/Text';
import Url from './shapes/Url';

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

	//maintain z-order since we're looping backwards (for speed)
	drawData.shapeList.reverse();

	let shapes = drawData.shapeList;
	let i = shapes.length - 1;

	for (i; i >= 0; i--) {
		shapes[i] = makeShape(shapes[i]);
	}

	return drawData;
}


function drawScene (data, canvas, finished) {
	let c = canvas,
		w = canvas.offsetWidth,
		h = canvas.offsetHeight,
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


	(function next(x, cb) {
		if (x < 0) {
			if (cb && cb.call) {
				cb();
			}
			return;
		}

		ctx.save();
		shapes[x].draw(ctx, ()=>{
			ctx.restore();
			next(x - 1, cb);
		});

	}(i, finished));
}


export default class Canvas {

	constructor (data) {
		this.el = document.createElement('canvas');
		this.updateData(data);
	}


	attachHidden(parent) {
		Object.assign(this.el.style, {visibility: 'hidden', position: 'absolute'});
		parent.appendChild(this.el);
	}


	detach() {
		let p = this.el.parentNode;
		if (p) {
			p.removeChild(this.el);
		}
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
			shapes = this.scene.shapeList,
			i = shapes.length - 1;

		data.shapeList	= [];
		data.MimeType	= 'application/vnd.nextthought.canvas';
		data.Class	= 'Canvas';
		data.viewportRatio = this.viewportRatio;
		data.NTIID = this.scene.NTIID;


		for (i; i >= 0; i--) {
			data.shapeList.push(shapes[i].getJSON());
		}

		return data;
	}


	setSize (width, height, redraw=true) {
		height = Math.round(width / (this.viewportRatio || 1));

		Object.assign(this.el.style, {
			width: width + 'px',
			height: height + 'px'
		});

		if (redraw) {
			setTimeout(()=>this.drawScene(), 1);
		}
	}


	drawScene () {
		if (!this.scene) {
			return Promise.reject('No Scene to draw');
		}

		if (this.drawing) {
			console.log('called while drawing');
			return Promise.reject('Cannot begin drawing while already drawing.');
		}

		this.drawing = true;

		return new Promise(finish=>{
			drawScene(this.scene, this.el, ()=>{
				delete this.drawing;
				finish(this);
			});
		});
	}


	addShape (shape) {
		this.scene.shapeList.unshift(shape);
	}


	toDataURL (format='image/png') {
		return this.el.toDataURL(format);
	}


	static getThumbnail (scene) {
		let c = new this(scene);
		c.attachHidden(document.body);
		c.setSize(580, 580 / (scene.viewportRatio || 1), false);

		return c.drawScene().then(()=>{
			try {
				return c.toDataURL();
			}
			finally {
				c.detach();
			}
		});
	}
}
