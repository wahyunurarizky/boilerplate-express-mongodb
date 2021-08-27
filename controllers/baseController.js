const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const filterObj = (obj, allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('no docs found with that id', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model, ...fields) =>
  catchAsync(async (req, res, next) => {
    const filteredBody = filterObj(req.body, fields);

    const updatedDoc = await Model.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        // jangan lupa run validators pada update
        new: true,
        runValidators: true,
      }
    );
    if (!updatedDoc) {
      return next(new AppError('no docs found with that id', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  });

exports.createOne = (Model, ...fields) =>
  catchAsync(async (req, res, next) => {
    const filteredBody = filterObj(req.body, fields);

    const doc = await Model.create(filteredBody);

    res.status(201).json({
      status: 'success',
      data: {
        doc: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('no docs found with that id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc,
      },
    });
  });

exports.getAll = (Model, popOptions, search, sort) =>
  catchAsync(async (req, res, next) => {
    console.log('asdasd');
    const features = new APIFeatures(Model.find(req.filter), req.query)
      .filter()
      .sort(sort)
      .limit()
      .paginate()
      .search(search);
    const docs = await features.query.populate(popOptions);
    // const docs = await features.query.explain();

    res.status(200).json({
      status: 'succcess',
      results: docs.length,
      data: {
        docs,
      },
    });
  });
