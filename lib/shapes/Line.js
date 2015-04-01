import Base from './Base';
import {toRadians, getDegrees, getDistance} from '../Utils';
import Matrix from '../Matrix';

export default class Line extends Base {

	getShapeName () {
		return 'Line';
	}


	draw (ctx, drawNext) {
		let t = this.transform,
			xy = this.getEndPoint();

		this.transform = { 'a': 1, 'd': 1, 'tx': t.tx, 'ty': t.ty };
		super.draw(...arguments);
		this.transform = t;

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(xy[0], xy[1]);
		ctx.closePath();

		delete this.cache.fill;
		this.bbox = {
			x: 0,	w: 1,
			y: (-ctx.lineWidth * 3 - 40 / ctx.canvas.width) / 2,	h: (ctx.lineWidth * 3 + 40 / ctx.canvas.width)
		};

		this.performFillAndStroke(ctx);
		drawNext();
	}


	getEndPoint (m) {
		m = m || new Matrix(this.transform);
		let scale = m.getScale(true),
			rad = m.getRotation();
		return [
			scale * Math.cos(rad),
			scale * Math.sin(rad)
		];
	}


	modify (nib, x1, y1) {
		let m = new Matrix(this.transform),
			t = m.getTranslation(),
			p = [t[0], t[1]];


		p.push(x1, y1);

		m = new Matrix();
		m.translate(t[0], t[1]);
		m.scale(getDistance(p));
		//full range 0-2PI not just -PI/2 - PI/2
		m.rotate(toRadians(getDegrees(p)));

		this.transform = m.toTransform();
	}


	showNibs (ctx) {

		ctx.save();

		let m = new Matrix(this.transform);
		let drawMatrix = new Matrix();

		m.scaleAll(ctx.canvas.width);

		let scale = m.getScale();
		let t = m.getTranslation();
		let rot = m.getRotation();

		drawMatrix.translate(t[0], t[1]);
		drawMatrix.scale(scale[0], scale[1]);
		drawMatrix.rotate(rot);

		ctx.setTransform(1, 0, 0, 1, 0, 0);

		ctx.lineWidth = 2;
		ctx.beginPath();
		this.drawNib(ctx, 7, 1, 0, drawMatrix, m, 'line');

		ctx.closePath();
		ctx.shadowColor = 'None';
		ctx.strokeStyle = '#004CB3';
		ctx.fillStyle = '#8ED6FF';
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	}

}
