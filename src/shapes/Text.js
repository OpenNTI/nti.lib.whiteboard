import Base from './Base';

export default class Circle extends Base {


	constructor (config) {
		super(config, ['font-face']);
	}


	draw (ctx, drawNext) {
		super.draw(ctx);

		if (!this.cache['font-face']) {
			this.cache['font-face'] = '1px ' + this['font-face'];
		}

		ctx.font = this.cache['font-face'];
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';

		let w = ctx.measureText(this.text).width,
			h = 1.3,
			x = -w / 2,
			y = -h / 2;


		if (this.cache.fill) {
			ctx.fillText(this.text, x, y);
		}

		if (this.cache.stroke && this.strokeWidth) {
			ctx.strokeText(this.text, x, y);
		}

		this.bbox = {
			x: x,	w: w,
			y: y,	h: h
		};

		if (this.selected === 'Hand') {
			this.showNibs(ctx);
		}

		drawNext();
	}
}
