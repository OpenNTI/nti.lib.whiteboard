import Base from './Base';
import Matrix from '../Matrix';

export default class Path extends Base {


	draw (ctx, drawNext) {
		super(ctx);

		let p = Object.assign({}, this.points),
			l = p.length, i = 0, po = [], midP = [], p1 = [],
			minx = 0, miny = 0,
			maxx = 0, maxy = 0;

		ctx.beginPath();
		for (; i < l; i += 2) {
			po[0] = p[i];
			po[1] = p[i + 1];

			if (po[0] > maxx) { maxx = po[0]; }
			if (po[0] < minx) { minx = po[0]; }

			if (po[1] > maxy) { maxy = po[1]; }
			if (po[1] < miny) { miny = po[1]; }

			if (i + 3 > l) {
				ctx.lineTo(po[0], po[1]);
			}
			else {
				//Note: we're need at least two points.
				p1[0] = p[i + 2];
				p1[1] = p[i + 3];
				midP[0] = (p1[0] + po[0]) / 2;
				midP[1] = (p1[1] + po[1]) / 2;
				ctx.moveTo(po[0], po[1]);
				ctx.quadraticCurveTo(midP[0], midP[1], p1[0], p1[1]);
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


  //	nibRotate: function(m, x,y){
  //		var c = this.getCenter(true),
  //			t = m.getTranslation(),
  //			rot = m.getRotation(),
  //			newM, c1, cx, cy;
  //
  //		console.log('current Matrix: ', m.m);
  //
  //		//Inverse rotation.
  //		m.rotate(-rot);
  //
  //		console.log('Initial starting point: ', t);
  ////		cx = c[0]-t[0];
  ////		cy = c[1]-t[1];
  ////		m.translate( -cx, -cy);
  //
  //		this.transform = super(...arguments);
  //		newM = new Matrix(this.transform);
  //		console.log('new starting point after rotation: ', newM.getTranslation());
  //
  //		c1 = this.getCenter(true);
  //		newM.translate(  c[0]-c1[0], c[1]-c1[1] );
  //
  //		return newM.toTransform();
  //	}
}
