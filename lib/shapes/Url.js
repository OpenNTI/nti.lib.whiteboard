import Base from './Base';
import {canUse, maybeProxyImage} from '../Utils';

const BROKEN_IMAGE = {

};

export default class Url extends Base {

	constructor () {
		this.calculatedAttributes = ['url'];
		super();
	}

	draw (ctx, drawNext) {
		let me = this,
			image = me.cache.url || null,
			x, y, w, h;

		if (!image) {
			if (!me.url) {
				drawNext();
				return;
			}


			image = new Image();
			image.onload = ()=>this.imageLoaded(image, ctx, drawNext);
			image.onerror = ()=>this.imageFailed(image, ctx, drawNext);
			maybeProxyImage(me.url, image);
			me.cache.url = image;
			return;
		}

		super(...arguments);
		w = image.width;
		h = image.height;
		x = -w / 2;
		y = -h / 2;
		ctx.drawImage(image, x, y);
		me.bbox = {x: x, y: y, w: w, h: h};

		if (me.selected === 'Hand') {
			me.showNibs(ctx);
		}

		drawNext();
	}


	imageLoaded (image, ctx, cb) {
		if (canUse(image)) {
			this.draw(ctx, cb);
			return;
		}

		if (image.src !== BROKEN_IMAGE && BROKEN_IMAGE) {
			image.src = BROKEN_IMAGE;
		}
	}


	imageFailed (image, ctx, cb) {
		console.log('failed to load: ' + this.url);
		if (this.url !== BROKEN_IMAGE && BROKEN_IMAGE) {
			image.src = BROKEN_IMAGE;
			return;
		}

		cb.call(this);
	}
}
