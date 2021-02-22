import Base from './Base';

export default class Circle extends Base {
	draw(ctx, drawNext) {
		super.draw(ctx);

		ctx.beginPath();
		ctx.arc(0, 0, 0.5, 0, Math.PI * 2, true);
		ctx.closePath();

		this.bbox = {
			x: -0.5,
			w: 1,
			y: -0.5,
			h: 1,
		};

		this.performFillAndStroke(ctx);
		drawNext();
	}
}
