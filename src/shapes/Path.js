import Matrix from '../Matrix';

import Base from './Base';

export default class Path extends Base {


	draw (ctx, drawNext) {
		super.draw(ctx);

		let p = this.points.slice(),
			l = p.length,
			minx = 0, miny = 0,
			maxx = 0, maxy = 0;

		ctx.beginPath();

		for (let i = 0; i < l; i += 2) {
			let x = p[i],
				y = p[i + 1];

			if (x > maxx) { maxx = x; }
			if (x < minx) { minx = x; }

			if (y > maxy) { maxy = y; }
			if (y < miny) { miny = y; }

			if (i + 3 > l) {
				ctx.lineTo(x, y);
			}
			else {
				let x2 = p[i + 2],
					y2 = p[i + 3];

				let midX = (x2 + x) / 2,
					midY = (y2 + y) / 2;

				ctx.moveTo(x, y);
				ctx.quadraticCurveTo(midX, midY, x2, y2);
			}
		}
		// ctx.closePath();

		this.bbox = {
			x: minx,	w: maxx - minx,
			y: miny,	h: maxy - miny
		};

		ctx.lineCap = 'round';
		this.performFillAndStroke(ctx);
		drawNext();
	}


	getCenter (transformed) {
		if (!this.bbox) { return void 0; }

		let center = [this.bbox.x + (this.bbox.w / 2), this.bbox.y + (this.bbox.h / 2)],
			m = new Matrix(this.transform);
		if (transformed) {
			return m.transformPoint(center);
		}
		return center;
	}


	shouldEnableRotation () {
		return false;
	}
}
