export default class TransformLimitReached extends Error {
	constructor () {
		super('Transform limit reached');
	}
}
