const { mongoose } = require('../models');

module.exports = class BaseRepository {
	constructor(modelName) {
		this.model = mongoose.model(modelName);
	}

	getMany(options) {
		const newOptions = Object.assign({
			isLean: true,
			page: 1,
			limit: 20,
			fields: '',
			populate: [],
			sort: ''
		}, options);
		if (newOptions.limit > 100) {
			newOptions.limit = 100;
		}

		newOptions.where = Object.assign({}, {
			deletedAt: null
		}, newOptions.where);
		const skip = (newOptions.page - 1) * newOptions.limit;

		return this.model.find(newOptions.where)
			.skip(parseInt(skip))
			.limit(parseInt(newOptions.limit))
			.select(newOptions.fields)
			.sort(newOptions.sort)
			.populate(newOptions.populate)
			.lean(newOptions.isLean);
	}

	getAll(options) {
		const newOptions = Object.assign({
			isLean: true,
			fields: '',
			populate: [],
			sort: ''
		}, options);

		newOptions.where = Object.assign({}, {
			deletedAt: null
		}, newOptions.where);

		return this.model.find(newOptions.where)
			.select(newOptions.fields)
			.sort(newOptions.sort)
			.populate(newOptions.populate)
			.lean(newOptions.isLean);
	}

	getOne(options) {
		const newOptions = Object.assign({
			isLean: true,
			populate: [],
			fields: '',
			sort: ''
		}, options);

		newOptions.where = Object.assign({}, {
			deletedAt: null
		}, newOptions.where);

		return this.model.findOne(newOptions.where)
			.sort(newOptions.sort)
			.populate(newOptions.populate)
			.select(newOptions.fields)
			.lean(newOptions.isLean);
	}

	create(data) {
		if (Array.isArray(data)) {
			return this.model.insertMany(data);
		}
		return this.model.create(data);
	}

	deleteOne(conditions) {
		const newConditions = Object.assign({
			deletedAt: null
		}, conditions);

		return this.model.updateOne(newConditions, {
			deletedAt: new Date()
		});
	}

	deleteMany(conditions) {
		const newConditions = Object.assign({
			deletedAt: null
		}, conditions);

		return this.model.updateMany(newConditions, {
			deletedAt: new Date()
		});
	}

	getOneAndUpdate(options) {
		const newOptions = Object.assign({
			isLean: true
		}, options);

		newOptions.where = Object.assign({}, {
			deletedAt: null,
		}, newOptions.where);

		newOptions.options = Object.assign({}, {
			new: true,
		}, newOptions.options);

		return this.model.findOneAndUpdate(newOptions.where, newOptions.data, newOptions.options).lean(newOptions.isLean);
	}

	count(options) {
		const newOptions = Object.assign({
			deletedAt: null
		}, options);

		return this.model.countDocuments(newOptions);
	}

	updateOne(options) {
		const newOptions = { ...options };
		newOptions.where = Object.assign({}, {
			deletedAt: null
		}, newOptions.where);
		newOptions.options = Object.assign({}, {
			new: true
		}, newOptions.options);
		return this.model.updateOne(newOptions.where, newOptions.data, newOptions.options);
	}

	updateMany(options) {
		const newOptions = { ...options };
		newOptions.where = Object.assign({}, {
			deletedAt: null
		}, newOptions.where);
		newOptions.options = Object.assign({}, {
			new: true
		}, newOptions.options);
		return this.model.updateMany(newOptions.where, newOptions.data, newOptions.options);
	}
};