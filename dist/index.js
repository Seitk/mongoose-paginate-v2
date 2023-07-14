'use strict';

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly &&
      (symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      })),
      keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2
      ? ownKeys(Object(source), !0).forEach(function (key) {
          _defineProperty(target, key, source[key]);
        })
      : Object.getOwnPropertyDescriptors
      ? Object.defineProperties(
          target,
          Object.getOwnPropertyDescriptors(source)
        )
      : ownKeys(Object(source)).forEach(function (key) {
          Object.defineProperty(
            target,
            key,
            Object.getOwnPropertyDescriptor(source, key)
          );
        });
  }
  return target;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, 'string');
  return typeof key === 'symbol' ? key : String(key);
}
function _toPrimitive(input, hint) {
  if (typeof input !== 'object' || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== undefined) {
    var res = prim.call(input, hint || 'default');
    if (typeof res !== 'object') return res;
    throw new TypeError('@@toPrimitive must return a primitive value.');
  }
  return (hint === 'string' ? String : Number)(input);
}
/**
 * @param {Object}              [query={}]
 * @param {Object}              [options={}]
 * @param {Object|String}       [options.select='']
 * @param {Object|String}       [options.projection={}]
 * @param {Object}              [options.options={}]
 * @param {Object|String}       [options.sort]
 * @param {Object|String}       [options.customLabels]
 * @param {Object}              [options.collation]
 * @param {Array|Object|String} [options.populate]
 * @param {Boolean}             [options.lean=false]
 * @param {Boolean}             [options.leanWithId=true]
 * @param {Number}              [options.offset=0] - Use offset or page to set skip position
 * @param {Number}              [options.page=1]
 * @param {Number}              [options.limit=10]
 * @param {Boolean}             [options.useEstimatedCount=true] - Enable estimatedDocumentCount for larger datasets. As the name says, the count may not abe accurate.
 * @param {Function}            [options.useCustomCountFn=false] - use custom function for count datasets.
 * @param {Object}              [options.read={}] - Determines the MongoDB nodes from which to read.
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
var PaginationParametersHelper = require('./pagination-parameters');
var defaultOptions = {
  customLabels: {
    totalDocs: 'totalDocs',
    limit: 'limit',
    page: 'page',
    totalPages: 'totalPages',
    docs: 'docs',
    nextPage: 'nextPage',
    prevPage: 'prevPage',
    pagingCounter: 'pagingCounter',
    hasPrevPage: 'hasPrevPage',
    hasNextPage: 'hasNextPage',
    meta: null,
  },
  collation: {},
  lean: false,
  leanWithId: true,
  limit: 10,
  projection: {},
  select: '',
  options: {},
  pagination: true,
  useEstimatedCount: false,
  useCustomCountFn: false,
  forceCountFn: false,
  allowDiskUse: false,
};
function paginate(query, options, callback) {
  options = _objectSpread(
    _objectSpread(_objectSpread({}, defaultOptions), paginate.options),
    options
  );
  query = query || {};
  var _options = options,
    collation = _options.collation,
    lean = _options.lean,
    leanWithId = _options.leanWithId,
    populate = _options.populate,
    projection = _options.projection,
    read = _options.read,
    select = _options.select,
    sort = _options.sort,
    pagination = _options.pagination,
    useEstimatedCount = _options.useEstimatedCount,
    useCustomCountFn = _options.useCustomCountFn,
    forceCountFn = _options.forceCountFn,
    allowDiskUse = _options.allowDiskUse;
  var customLabels = _objectSpread(
    _objectSpread({}, defaultOptions.customLabels),
    options.customLabels
  );
  var limit = defaultOptions.limit;
  if (pagination) {
    limit = parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 0;
  }
  var isCallbackSpecified = typeof callback === 'function';
  var findOptions = options.options;
  var offset;
  var page;
  var skip;
  var docsPromise = [];

  // Labels
  var labelDocs = customLabels.docs;
  var labelLimit = customLabels.limit;
  var labelNextPage = customLabels.nextPage;
  var labelPage = customLabels.page;
  var labelPagingCounter = customLabels.pagingCounter;
  var labelPrevPage = customLabels.prevPage;
  var labelTotal = customLabels.totalDocs;
  var labelTotalPages = customLabels.totalPages;
  var labelHasPrevPage = customLabels.hasPrevPage;
  var labelHasNextPage = customLabels.hasNextPage;
  var labelMeta = customLabels.meta;
  if (Object.prototype.hasOwnProperty.call(options, 'offset')) {
    offset = parseInt(options.offset, 10);
    skip = offset;
  } else if (Object.prototype.hasOwnProperty.call(options, 'page')) {
    page = parseInt(options.page, 10) < 1 ? 1 : parseInt(options.page, 10);
    skip = (page - 1) * limit;
  } else {
    offset = 0;
    page = 1;
    skip = offset;
  }
  if (!pagination) {
    page = 1;
  }
  var countPromise;
  if (pagination) {
    if (forceCountFn === true) {
      // Deprecated since starting from MongoDB Node.JS driver v3.1

      // Hack for mongo < v3.4
      if (Object.keys(collation).length > 0) {
        countPromise = this.count(query).collation(collation).exec();
      } else {
        countPromise = this.count(query).exec();
      }
    } else {
      if (useEstimatedCount === true) {
        countPromise = this.estimatedDocumentCount().exec();
      } else if (typeof useCustomCountFn === 'function') {
        countPromise = useCustomCountFn();
      } else {
        // Hack for mongo < v3.4
        if (Object.keys(collation).length > 0) {
          countPromise = this.countDocuments(query).collation(collation).exec();
        } else {
          countPromise = this.countDocuments(query).exec();
        }
      }
    }
  }
  if (limit) {
    var mQuery = this.find(query, projection, findOptions);
    if (populate) {
      mQuery.populate(populate);
    }
    mQuery.select(select);
    mQuery.sort(sort);
    mQuery.lean(lean);
    if (read && read.pref) {
      /**
       * Determines the MongoDB nodes from which to read.
       * @param read.pref one of the listed preference options or aliases
       * @param read.tags optional tags for this query
       */
      mQuery.read(read.pref, read.tags);
    }

    // Hack for mongo < v3.4
    if (Object.keys(collation).length > 0) {
      mQuery.collation(collation);
    }
    if (pagination) {
      mQuery.skip(skip);
      mQuery.limit(limit);
    }
    try {
      if (allowDiskUse === true) {
        mQuery.allowDiskUse();
      }
    } catch (ex) {
      console.error('Your MongoDB version does not support `allowDiskUse`.');
    }
    docsPromise = mQuery.exec();
    if (lean && leanWithId) {
      docsPromise = docsPromise.then(function (docs) {
        docs.forEach(function (doc) {
          if (doc._id) {
            doc.id = String(doc._id);
          }
        });
        return docs;
      });
    }
  }
  return Promise.all([countPromise, docsPromise])
    .then(function (values) {
      var count = values[0];
      var docs = values[1];
      if (pagination !== true) {
        count = docs.length;
      }
      var meta = {
        [labelTotal]: count,
      };
      var result = {};
      if (typeof offset !== 'undefined') {
        meta.offset = offset;
        page = Math.ceil((offset + 1) / limit);
      }
      var pages = limit > 0 ? Math.ceil(count / limit) || 1 : null;

      // Setting default values
      meta[labelLimit] = count;
      meta[labelTotalPages] = 1;
      meta[labelPage] = page;
      meta[labelPagingCounter] = (page - 1) * limit + 1;
      meta[labelHasPrevPage] = false;
      meta[labelHasNextPage] = false;
      meta[labelPrevPage] = null;
      meta[labelNextPage] = null;
      if (pagination) {
        meta[labelLimit] = limit;
        meta[labelTotalPages] = pages;

        // Set prev page
        if (page > 1) {
          meta[labelHasPrevPage] = true;
          meta[labelPrevPage] = page - 1;
        } else if (page == 1 && typeof offset !== 'undefined' && offset !== 0) {
          meta[labelHasPrevPage] = true;
          meta[labelPrevPage] = 1;
        }

        // Set next page
        if (page < pages) {
          meta[labelHasNextPage] = true;
          meta[labelNextPage] = page + 1;
        }
      }

      // Remove customLabels set to false
      delete meta['false'];
      if (limit == 0) {
        meta[labelLimit] = 0;
        meta[labelTotalPages] = 1;
        meta[labelPage] = 1;
        meta[labelPagingCounter] = 1;
        meta[labelPrevPage] = null;
        meta[labelNextPage] = null;
        meta[labelHasPrevPage] = false;
        meta[labelHasNextPage] = false;
      }
      if (labelMeta) {
        result = {
          [labelDocs]: docs,
          [labelMeta]: meta,
        };
      } else {
        result = _objectSpread(
          {
            [labelDocs]: docs,
          },
          meta
        );
      }
      return isCallbackSpecified
        ? callback(null, result)
        : Promise.resolve(result);
    })
    .catch(function (error) {
      return isCallbackSpecified ? callback(error) : Promise.reject(error);
    });
}

/**
 * @param {Schema} schema
 */
module.exports = function (schema) {
  schema.statics.paginate = paginate;
};
module.exports.PaginationParameters = PaginationParametersHelper;
module.exports.paginate = paginate;
