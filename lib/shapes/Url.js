import Base from './Base';
import {canUse, maybeProxyImage} from '../utils';

const BROKEN_IMAGE = {

};

export default class Url extends Base {

	constructor () {
		this.calculatedAttributes = ['url'];
		super(...arguments);
	}

	draw (ctx, drawNext) {
		let image = this.cache.url || null;

		if (!image) {
			if (!this.url) {
				drawNext();
				return;
			}


			image = new Image();
			image.onload = ()=>this.imageLoaded(image, ctx, drawNext);
			image.onerror = ()=>this.imageFailed(image, ctx, drawNext);
			maybeProxyImage(this.url, image);
			this.cache.url = image;
			return;
		}

		super.draw(...arguments);
		let w = image.width;
		let h = image.height;
		let x = -w / 2;
		let y = -h / 2;
		ctx.drawImage(image, x, y);
		this.bbox = {x: x, y: y, w: w, h: h};

		if (this.selected === 'Hand') {
			this.showNibs(ctx);
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
