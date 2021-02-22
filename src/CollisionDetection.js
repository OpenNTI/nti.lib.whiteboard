/**
 * This class is experimental, it does not totally work right.  However it can
 * probably be fixed at some point so I've checked it in. As of the checkin
 * time, it is not referenced anywhere and will be tossed out by the
 * minification process which is just fine.
 */
export default class CollisionDetection {
	normal(vect) {
		return [vect[1], -vect[0]];
	}

	normalize(vect) {
		return [vect[0] / this.magnitude(vect), vect[1] / this.magnitude(vect)];
	}

	dotProduct(v1, v2) {
		let dot = 0,
			i;
		for (i = 0; i < v1.length; i++) {
			dot += v1[i] * v2[i];
		}
		return dot;
	}

	magnitude(vect) {
		return Math.sqrt(vect[0] * vect[0] + vect[1] * vect[1]);
	}

	isColliding(obj1, obj2) {
		let w1 = obj1.width;
		let h1 = obj1.height;
		let x1 = obj1.x;
		let y1 = obj1.y;
		let angle1 = obj1.angle;

		let w2 = obj2.width;
		let h2 = obj2.height;
		let x2 = obj2.x;
		let y2 = obj2.y;
		let angle2 = obj2.angle;

		let axes = [];

		let j, i;
		axes[0] = this.normal([Math.cos(angle1), Math.sin(angle1)]);
		axes[1] = this.normal([
			Math.cos(angle1 + Math.PI / 2),
			Math.sin(angle1 + Math.PI / 2),
		]);
		axes[2] = this.normal([Math.cos(angle2), Math.sin(angle2)]);
		axes[3] = this.normal([
			Math.cos(angle2 + Math.PI / 2),
			Math.sin(angle2 + Math.PI / 2),
		]);

		let l1 = Math.sqrt(w1 * w1 + h1 * h1);
		let l2 = Math.sqrt(w2 * w2 + h2 * h2);
		let ang1 = Math.atan2(h1, w1);
		let ang2 = Math.atan2(h2, w2);

		for (j = 0; j < 4; j++) {
			let p1 = [];
			let p2 = [];

			for (i = 0; i < 4; i++) {
				let newAng1 = angle1;
				let newAng2 = angle2;
				if (i === 0) {
					newAng1 += ang1;
					newAng2 += ang2;
				} else if (i === 1) {
					newAng1 += Math.PI - ang1;
					newAng2 += Math.PI - ang2;
				} else if (i === 2) {
					newAng1 += Math.PI + ang1;
					newAng2 += Math.PI + ang2;
				} else {
					newAng1 -= ang1;
					newAng2 -= ang2;
				}
				let point1 = [
					x1 + l1 * Math.cos(newAng1),
					y1 + l1 * Math.sin(newAng1),
				];
				point1 =
					this.dotProduct(point1, axes[j]) / this.magnitude(axes[j]);
				let point2 = [
					x2 + l2 * Math.cos(newAng2),
					y2 + l2 * Math.sin(newAng2),
				];
				point2 =
					this.dotProduct(point2, axes[j]) / this.magnitude(axes[j]);

				if (point1 < p1[0] || !p1[0]) {
					p1[0] = Math.round(point1);
				}
				if (point1 > p1[1] || !p1[1]) {
					p1[1] = Math.round(point1);
				}
				if (point2 < p2[0] || !p2[0]) {
					p2[0] = Math.round(point2);
				}
				if (point2 > p2[1] || !p2[1]) {
					p2[1] = Math.round(point2);
				}
			}
			if (!this.isTouching(p1, p2)) {
				return false;
			}
		}
		return true;
	}

	isTouching(p1, p2) {
		if (p2[1] >= p1[0] && p2[1] <= p1[1]) {
			return true;
		} else if (p2[0] <= p1[1] && p2[0] >= p1[0]) {
			return true;
		} else if (p1[0] > p2[0] && p1[1] < p2[1]) {
			return true;
		} else if (p2[0] > p1[0] && p2[1] < p1[1]) {
			return true;
		} else {
			return false;
		}
	}
}
