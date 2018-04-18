import Logger from '@nti/util-logger';

import TransformLimitReached from '../TransformLimitReached';
import Color from '../Color';
import Matrix from '../Matrix';
import {toRadians, getDegrees} from '../utils';

const logger = Logger.get('lib:whiteboard:shapes:base');

const COLOR = /rgba\((.+?),(.+?),(.+?),(.+?)\)/im;

const SPECIAL_KEYS = ['bbox', 'selected', 'nibData', 'cache', 'tracked'];

export default class Base {

	constructor (config, additionalCalculatedAttributes = []) {
		this.STOP_NIB = {};
		this.IDENTITY = { 'Class': 'CanvasAffineTransform', 'a': 1, 'b': 0, 'c': 0, 'd': 1, 'tx': 0, 'ty': 0 };

		this.calculatedAttributes = ['fill', 'stroke'].concat(additionalCalculatedAttributes);
		this.defineCacheAttributes();

		let name = this.constructor.name;

		this.Class = `Canvas${name}Shape`;

		Object.assign(this, config);

		//Convert DataServer color values to CSS color values
		if (this.fillRGBAColor) {
			this.fill = Color.parse(this.fillRGBAColor).toString();
			delete this.fillRGBAColor;
		}

		if (this.strokeRGBAColor) {
			this.stroke = Color.parse(this.strokeRGBAColor).toString();
			delete this.strokeRGBAColor;
		}
	}


	defineCacheAttributes () {
		Object.defineProperty(this, 'tracked', {enumerable: false, value: {}});
		Object.defineProperty(this, 'cache', {enumerable: false, value: {}});

		this.calculatedAttributes.forEach(p => {
			Object.defineProperty(this, p, {
				enumerable: true,
				set: newValue=> { this.tracked[p] = newValue; delete this.cache[p]; },
				get: ()=>this.tracked[p]
			});
		});
	}


	getShapeName () {
		try {
			return (/^Canvas(.+?)Shape$/i).exec(this.Class)[1];
		}
		catch (e) {
			return 'Unknown';
		}
	}


	getTransformMatrix (ctx) {
		let m = new Matrix(this.transform),
			w = ctx.canvas.width;

		m.scaleAll(w);

		return m;
	}


	draw (ctx/*, drawNext*/) {
		let m = this.getTransformMatrix(ctx);
		let w = ctx.canvas.width;
		let scale = m.getScaleAsScaler();

		ctx.shadowColor = null;
		m.applyTo(ctx);

		if (this.selected) {
			ctx.shadowColor = null;
			//turn off shadow glow thing for now
			// ctx.shadowOffsetX = 0;
			// ctx.shadowOffsetY = 0;
			// ctx.shadowBlur = 10;
			// ctx.shadowColor = "rgba(0,0,255,1)";
			this.nibData = {};
		}
		else {
			delete this.nibData;
		}

		ctx.fillStyle = this.cacheColor('fill');
		ctx.strokeStyle = this.cacheColor('stroke');

		ctx.lineWidth = (parseFloat(this.strokeWidth) * w) / scale * (scale < 0 ? -1 : 1);
		if (!isFinite(ctx.lineWidth) || isNaN(ctx.lineWidth)) {
			ctx.lineWidth = 0;
		}
	}


	cacheColor (name) {
		let cache = this.cache[name],
			value;

		if (cache) { return cache; }

		value = this[name];

		if (!value || value === 'None') {
			delete this.tracked[name];
			delete this.cache[name];
			return 'None';
		}

		try {
			this.cache[name] = this[name] = Color.parse(value).toString();
			return this.cache[name];
		}
		catch (er) {
			logger.debug('error parsing color: ', value);
		}
		return '#000000';
	}


	getJSON () {
		let data = {};

		data.MimeType = 'application/vnd.nextthought.' + (this.Class.toLowerCase());

		function convertRGBA (s, r, g, b, a) {
			r = parseInt(r, 10) / 255;
			g = parseInt(g, 10) / 255;
			b = parseInt(b, 10) / 255;
			a = parseFloat(a);
			return [r.toFixed(4), g.toFixed(4), b.toFixed(4), a.toFixed(4)].join(' ');
		}

		for (let i in Object.keys(this)) {
			if (typeof this[i] !== 'function' && !SPECIAL_KEYS.includes(i)) {

				data[i] = this[i];

				if (typeof data[i] === 'string' && COLOR.test(data[i])) {
					//Convert our CSS color values to DataServer color values
					data[i + 'RGBAColor'] = data[i].replace(COLOR, convertRGBA);
					delete data[i];
				}
			}

		}

		if (!data.fillRGBAColor) { data.fillRGBAColor = '0 0 0 0'; }
		if (!data.strokeRGBAColor) { data.strokeRGBAColor = '0 0 0 0'; }

		return data;
	}


	performFillAndStroke (ctx) {
		if (this.cache.fill) { ctx.fill(); }
		if (this.cache.stroke && ctx.lineWidth) { ctx.stroke(); }

		if (this.selected === 'Hand') {
			this.showNibs(ctx);
		}
	}


	translate (dx, dy) {
		let t = this.transform;
		t.tx += dx;
		t.ty += dy;
	}


	/**
	 *
	 * @param {number} m the current matrix
	 * @param {number} x the mouse's X cordinate on the canvas
	 * @param {number} y the mouse's Y cordinate on the canvas
	 * @param {number} dx the mouse's change in X (magnitude)
	 * @param {number} dy the mouse's change in Y (magnitude)
	 * @param {number}sx 0 or 1 to indicate if the nib can move in that direction
	 * @param {number} sy 0 or 1 to indicate if the nib can move in that direction
	 * @returns {number[]} The array form of the matrix.
	 */
	nibUpdate (m, x, y, dx, dy, sx, sy) {

		//let clamp = n => n === 0 ? 0 : (n < 0 ? -1 : 1);

		let s = m.getScale(),
			w = this.bbox.w / 2,
			h = this.bbox.h / 2,
			r = -m.getRotation();

		//logger.debug(sx, sy);
		let adjustedDx = dx * Math.cos(r) - dy * Math.sin(r);
		let adjustedDy = dx * Math.sin(r) + dy * Math.cos(r);

		//logger.debug(adjustedDx, adjustedDy, mag);
		sx = s[0] + (sx * adjustedDx) / w;
		sy = s[1] + (sy * adjustedDy) / h;
		//logger.debug(sx, sy);

		if (sx >= 0 && sy >= 0) {
			let translate = [0, 0];
			if(this.getCenter && this.points && this.bbox) {
				let center = this.getCenter(false);
				let origin = [this.points[0], this.points[1]];
				translate = [origin[0] - center[0], origin[1] - center[1]];
			}

			m.translate(-translate[0], -translate[1]);
			m.scale(1 / s[0], 1 / s[1]);
			m.scale(sx, sy);
			m.translate(translate[0], translate[1]);
		}
		else {
			throw this.STOP_NIB;
		}

		return m.toTransform();
	}


	/**
     * For resizing from the conrners we constrain the aspect ratio of the shape.
	 * We model the interaction off of google docs constrained image resizing.
	 * We look only at the change in y value (corrected for any current rotation)
	 * and adjust the size soley based on that while ensuring we maintain the ratio
     *
	 * @param {string} nib the name of the resize handle (nib)
	 * @param {number} dx the mouse's change in X (magnitude)
	 * @param {number} dy the mouse's change in Y (magnitude)
	 * @returns {void}
	 */
	scaleWithConstraint (nib, dx, dy) {
		let m = new Matrix(this.transform),
			s = m.getScale(),
			//c = m.getTranslation(),
			r = -m.getRotation(),
			w = this.bbox.w / 2,
			h = this.bbox.h / 2,
			ratio = s[0] / s[1],
			adjustedDx, adjustedDy, sign, sx, sy;

		adjustedDy = dx * Math.sin(r) + dy * Math.cos(r);
		adjustedDx = dx * Math.cos(r) - dy * Math.sin(r);

		//but lock depending on the the ratio
		if (ratio <= 1) { //lock moving in the y
			adjustedDx = adjustedDy * ratio;
			sign = /t-/.test(nib) ? -1 : 1;
		}
		else { //look moving in the x
			adjustedDy = adjustedDx / ratio;
			sign = /-l/.test(nib) ? -1 : 1;

		}

		adjustedDx *= sign;
		adjustedDy *= sign;

		let translate = [0, 0];
		if(this.getCenter && this.points && this.bbox) {
			let center = this.getCenter(false);
			let origin = [this.points[0], this.points[1]];
			translate = [origin[0] - center[0], origin[1] - center[1]];
		}

		m.translate(-translate[0], -translate[1]);
		sx = s[0] + adjustedDx / w;
		sy = s[1] + adjustedDy / h;
		m.scale(1 / s[0], 1 / s[1]);
		m.scale(sx, sy);
		m.translate(translate[0], translate[1]);
		this.transform = m.toTransform();
	}


	nibRotate (m, x, y) {
		let t = m.getTranslation(),
			s = m.getScale();

		m = new Matrix();
		m.translate(t[0], t[1]);

		m.rotate(toRadians(getDegrees([t[0], t[1], x, y])));

		m.scale(s[0], s[1]);

		return m.toTransform();
	}


	modify (nib, x1, y1, x2, y2, dx, dy) {
		let m = new Matrix(this.transform),
			map = {
				'l': ()=> this.nibUpdate(m, x1, y1, dx, dy, -1, 0),
				't': ()=> this.nibUpdate(m, x1, y1, dx, dy, 0, -1),
				't-l': ()=> this.nibUpdate(m, x1, y1, dx, dy, 1, 1),
				'r': ()=> this.nibUpdate(m, x1, y1, dx, dy, 1, 0),
				'b': ()=> this.nibUpdate(m, x1, y1, dx, dy, 0, 1),
				'b-r': ()=> this.nibUpdate(m, x1, y1, dx, dy, 1, 1),
				't-r': ()=> this.nibUpdate(m, x1, y1, dx, dy, 1, 1),
				'b-l': ()=> this.nibUpdate(m, x1, y1, dx, dy, 1, 1),
				'rot': ()=> this.nibRotate(m, x1, y1)
			};

		try {
			if (nib === 'rot1' || nib === 'rot2') {
				nib = 'rot';
			}
			this.transform = map[nib].call(this);
		}
		catch (e) {
			if (e === this.STOP_NIB) {
				throw new TransformLimitReached();
			}
			logger.error('No modifier for ', nib);
		}
	}


	drawNib (ctx, r, x, y, drawMatrix, m, name, s, a) {

		s = s || 0;
		a = a || Math.PI * 2;

		let xy = drawMatrix.transformPoint(x, y);
		if (name === 'l' || name === 'r' || name === 'b' || name === 't') {
			ctx.lineWidth = 1;
			ctx.fillRect(xy[0] - r / 2, xy[1] - r / 2, r, r);
			ctx.strokeRect(xy[0] - r / 2, xy[1] - r / 2, r, r);
		}
		else if (name !== 'rot') {
			ctx.lineWidth = 2;
			ctx.moveTo(xy[0] + r, xy[1]);
			ctx.arc(xy[0], xy[1], r, s, a, name !== 'rot2');
		}
		else if (name === 'rot') {
			ctx.lineWidth = 1;
			ctx.fillStyle = '#8ED6FF';

			ctx.moveTo(xy[0] + 3, xy[1]);

			xy[0] += 50;
			x += (50 / m.getScale()[0]);

			ctx.lineTo(xy[0] - r / 2, xy[1]);
			ctx.fillRect(xy[0] - r / 2, xy[1] - r / 2, r, r);
			ctx.strokeRect(xy[0] - r / 2, xy[1] - r / 2, r, r);
		}

		xy = m.transformPoint(x, y);
		//if nibData is there, fill it in, otherwise, throw away the data
		(this.nibData || {})[name] = {
			x: xy[0],
			y: xy[1],
			r: r
		};
	}


	shouldEnableRotation () {
		return true;
	}


	showNibs (ctx) {
		if (!this.bbox) {
			return;
		}

		ctx.save();

		let b = this.bbox,
			m = new Matrix(this.transform),
			drawMatrix = new Matrix(),
			r, rot, a, scale, center;

		//scale the normal values to the current size of the canvas
		m.scaleAll(ctx.canvas.width);

		rot = m.getRotation();
		scale = m.getScale();
		center = m.getTranslation();

		drawMatrix.translate(center[0], center[1]);
		drawMatrix.scale(scale[0], scale[1]);


		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.translate(center[0], center[1]);
		ctx.rotate(rot);
		ctx.translate(-center[0], -center[1]);

		r = 6;  //circle
		a = 8;  //square

		b.mx = (b.w / 2) + b.x;
		b.my = (b.h / 2) + b.y;
		b.xx = b.x + b.w;
		b.yy = b.y + b.h;

		ctx.lineWidth = 2;
		ctx.fillStyle = '#ffffff';
		ctx.strokeStyle = '#b1b1b1';
		ctx.beginPath();
		this.drawNib(ctx, r, b.x, b.y, drawMatrix, m, 't-l');

		this.drawNib(ctx, a, b.mx, b.y, drawMatrix, m, 't');
		this.drawNib(ctx, r, b.xx, b.y, drawMatrix, m, 't-r');

		this.drawNib(ctx, a, b.x, b.my, drawMatrix, m, 'l');
		this.drawNib(ctx, a, b.xx, b.my, drawMatrix, m, 'r');
		this.drawNib(ctx, r, b.x, b.yy, drawMatrix, m, 'b-l');

		this.drawNib(ctx, a, b.mx, b.yy, drawMatrix, m, 'b');
		this.drawNib(ctx, r, b.xx, b.yy, drawMatrix, m, 'b-r');
		ctx.closePath();
		ctx.shadowColor = 'None';
		ctx.fill();
		ctx.stroke();

		ctx.lineCap = 'round';
		ctx.lineWidth *= 2;

		//Note: COMMENT OUT THE NEXT THREE LINE TO TURN OFF ROTATION, if it's needed.
		if (this.shouldEnableRotation()) {
			ctx.beginPath();
			this.drawNib(ctx, r * 2, b.xx, b.my, drawMatrix, m, 'rot', rot);
			ctx.stroke();
		}

		ctx.restore();
	}


	/**
	 *
	 * @param {number} x Integer or Array of [X,Y] in canvas coordinate space
	 * @param {number} [y] Integer in canvas coordinate space
	 *
	 * @return {boolean} truthy, with the name of the nib if true, false if not within a nib.
	 */
	isPointInNib (x, y) {
		let nibs = this.nibData;
		if (!nibs) { return false; }

		if (Array.isArray(x)) {
			[x, y] = x;
		}

		for (let n of Object.keys(nibs)) {
			let nib = nibs[n];
			let dx = nib.x - x;
			let dy = nib.y - y;
			let d = Math.sqrt(dx * dx + dy * dy);
			if (d <= nib.r) {
				return n;
			// } else {
			// 	logger.debug(n, 'distance:', d, 'radius:', nib.r, 'nib xy: (', nib.x, nib.y,') point: (', x,y, ')');
			}
		}

		return false;
	}


	/**
	 *
	 * @param {number} x unit coordinate space
	 * @param {number} y unit coordinate space
	 *
	 * @return {boolean} true if the x,y coordinate is within the shape. False otherwise.
	 */
	isPointInShape (x, y) {
		if (!this.bbox) {
			logger.warn('no bounding box computed');
			return false;
		}

		let b = this.bbox,
			m = new Matrix(this.transform),
			x1, y1, x2, y2, x3, y3, x4, y4;

		x1 = m.transformPoint(b.x, b.y);
		[x1, y1] = x1;

		x2 = m.transformPoint(b.x, b.y + b.h);
		[x2, y2] = x2;

		x3 = m.transformPoint(b.x + b.w, b.y + b.h);
		[x3, y3] = x3;

		x4 = m.transformPoint(b.x + b.w, b.y);
		[x4, y4] = x4;

		return this.pointInPolygon(x, y, [[x1, y1], [x4, y4], [x3, y3], [x2, y2]]);
	}


	/**
	 *  Globals which should be set before calling this function:
	 *
	 *  @param {number} x point to be tested
	 *  @param {number} y point to be tested
	 *  @param {array[]} points two dimentional array with horizontal & vertical coordinates of corners in their own arrays
	 *
	 *  @return {boolean} true if the point x,y is inside the polygon, or false if it is not.  If the point is
	 *  exactly on the edge of the polygon, then the function may return true or false.
	 */
	pointInPolygon (x, y, points) {
		let dotProduct = (p1, p2) => p1[0] * p2[0] + p1[1] * p2[1];
		let subtractVector = (v1, v2) => [v1[0] - v2[0], v1[1] - v2[1]];

		let	point = [x, y];
		let p0p3 = subtractVector(points[3], points[0]),
			p0p1 = subtractVector(points[1], points[0]),
			v = subtractVector(point, points[0]);

		return	dotProduct(v, p0p3) >= 0 &&
				dotProduct(v, p0p3) <= dotProduct(p0p3, p0p3) &&
				dotProduct(v, p0p1) >= 0 &&
				dotProduct(v, p0p1) <= dotProduct(p0p1, p0p1);
	}

}
