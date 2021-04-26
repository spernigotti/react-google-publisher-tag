"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Horizontal;

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _react = _interopRequireDefault(require("react"));

var _GooglePublisherTag = _interopRequireDefault(require("./GooglePublisherTag"));

var _Format = _interopRequireDefault(require("./constants/Format"));

function Horizontal(props) {
  const {
    mobile
  } = props;
  const format = mobile ? _Format.default.MOBILE_HORIZONTAL : _Format.default.HORIZONTAL;
  return /*#__PURE__*/_react.default.createElement(_GooglePublisherTag.default, (0, _extends2.default)({}, props, {
    format: format
  }));
}
//# sourceMappingURL=Horizontal.js.map