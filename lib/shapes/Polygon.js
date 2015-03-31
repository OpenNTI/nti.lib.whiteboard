import Base from './Base';
// import {toRadians, getDegrees, getDistance} from '../Utils';
// import Matrix from '../Matrix';

export default class Circle extends Base {


	draw (ctx, drawNext) {
		super(...arguments);

		let x = 0,
			y = 0,

			i = 0,
			r = 0.5,
			n = this.sides,
			minx = 0, miny = 0,
			maxx = 0, maxy = 0;

		ctx.beginPath();
		if (this.sides === 4) {
			this.drawRect(ctx);
			minx = -0.5; miny = -0.5; maxx = 0.5; maxy = 0.5;
		}
		else {
			for (i; i < n; i++) {
				x = r * Math.cos(2 * Math.PI * i / n);
				y = r * Math.sin(2 * Math.PI * i / n);

				if (x > maxx) { maxx = x; }
				if (x < minx) { minx = x; }

				if (y > maxy) { maxy = y; }
				if (y < miny) { miny = y; }

				(!i ? ctx.moveTo : ctx.lineTo).apply(ctx, [x, y]);
			}
		}
		ctx.closePath();
		this.bbox = {
			x: minx,	w: maxx - minx,
			y: miny,	h: maxy - miny
		};

		this.performFillAndStroke(ctx);
		drawNext();
	}


	drawRect (ctx) {
		let x = -0.5,
			y = -0.5,
			w = 1,
			h = 1;

		ctx.moveTo(x, y);
		ctx.lineTo(x + w, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y, x + w, y);
		ctx.lineTo(x + w, y + h);
		ctx.quadraticCurveTo(x + w, y + h, x + w, y + h, x + w, y + h);
		ctx.lineTo(x, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h, x, y + h);
		ctx.lineTo(x, y);
		ctx.quadraticCurveTo(x, y, x, y, x, y);
	}


	drawTriangle (ctx) {
    /**
     * Unused func. We will use it to draw triangles correctly.
     */
		let w2 = 0.5,
			h2 = 0.5;

		ctx.beginPath();
		ctx.moveTo(-w2, h2);
		ctx.lineTo(0, -h2);
		ctx.lineTo(w2, h2);
	}
}
