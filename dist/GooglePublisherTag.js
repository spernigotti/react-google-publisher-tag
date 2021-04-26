"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _react = _interopRequireWildcard(require("react"));

var _reactMeasure = _interopRequireDefault(require("react-measure"));

var _debounce = _interopRequireDefault(require("lodash/debounce"));

var _Format = _interopRequireDefault(require("./constants/Format"));

var _Dimensions = _interopRequireDefault(require("./constants/Dimensions"));

/**
 * https://developers.google.com/doubleclick-gpt/reference
*/
let nextId = 1;
let scriptInitiated = false;

function getNextId() {
  nextId += 1;
  return `rgpt-${nextId}`;
}

function prepareDimensions(dimensions, format = _Format.default.HORIZONTAL, canBeLower = true) {
  if (!dimensions || !dimensions.length) {
    return _Dimensions.default[format] || [];
  }

  if (dimensions.length === 1 && canBeLower) {
    const dimension = dimensions[0];
    const key = `${dimension[0]}x${dimension[1]}`;

    if (_Dimensions.default[key]) {
      return _Dimensions.default[key] || [];
    }
  }

  return dimensions;
}

function loadScript() {
  const js = document.createElement('script');
  js.async = true;
  js.defer = true;
  js.src = 'https://www.googletagservices.com/tag/js/gpt.js'; // Delay the script append after a user interaction

  document.addEventListener('scroll', initOnEvent);
  document.addEventListener('mousemove', initOnEvent);
  document.addEventListener('touchstart', initOnEvent);

  function initOnEvent(event) {
    init();
    event.currentTarget.removeEventListener(event.type, initOnEvent);
  }

  function init() {
    if (scriptInitiated) {
      // Don't load again
      return false;
    }

    scriptInitiated = true;
    document.body.appendChild(js);
  }
}

function initGooglePublisherTag(options = {}, onInit) {
  const {
    path,
    onImpressionViewable,
    onSlotRenderEnded,
    onSlotVisibilityChanged
  } = options;
  const firstTime = !window.googletag;
  const googletag = window.googletag = window.googletag || {};
  googletag.cmd = googletag.cmd || [];

  if (firstTime) {
    googletag.cmd.push(() => {
      if (options.enableSingleRequest) {
        // Infinite scroll requires SRA
        googletag.pubads().enableSingleRequest();
      } // collapse div without ad
      // googletag.pubads().collapseEmptyDivs();
      // load ad with slot refresh


      googletag.pubads().disableInitialLoad(); // enable google publisher tag

      googletag.enableServices();
    });
    loadScript();
  } // Execute callback when the slot is visible in DOM (thrown before 'impressionViewable' )


  if (onSlotRenderEnded) {
    googletag.cmd.push(() => {
      googletag.pubads().addEventListener('slotRenderEnded', event => {
        // check if the current slot is the one the callback was added to
        // (as addEventListener is global)
        if (event.slot.getAdUnitPath() === path) {
          onSlotRenderEnded(event);
        }
      });
    });
  } // Execute callback when ad is completely visible in DOM


  if (onImpressionViewable) {
    googletag.cmd.push(() => {
      googletag.pubads().addEventListener('impressionViewable', event => {
        if (event.slot.getAdUnitPath() === path) {
          onImpressionViewable(event);
        }
      });
    });
  } // Execute callback whenever the on-screen percentage of an ad slot's area changes


  if (onSlotVisibilityChanged) {
    googletag.cmd.push(() => {
      googletag.pubads().addEventListener('slotVisibilityChanged', event => {
        if (event.slot.getAdUnitPath() === path) {
          onSlotVisibilityChanged(event);
        }
      });
    });
  }

  if (onInit) {
    googletag.cmd.push(() => {
      onInit(googletag);
    });
  }
}

class GooglePublisherTag extends _react.PureComponent {
  constructor(..._args) {
    super(..._args);
    (0, _defineProperty2.default)(this, "state", {});
    (0, _defineProperty2.default)(this, "handleResize", contentRect => {
      this.setState({
        bounds: contentRect.bounds
      }, () => {
        this.update(this.props);
      });
    });
    (0, _defineProperty2.default)(this, "update", (0, _debounce.default)(props => {
      const {
        id,
        node,
        googletag,
        state: {
          bounds
        }
      } = this;

      if (!googletag || !node || !bounds) {
        return;
      }

      const {
        width
      } = bounds;
      const {
        dimensions,
        format,
        canBeLower,
        targeting,
        collapseEmpty,
        fluid
      } = props;
      const availableDimensions = prepareDimensions(dimensions, format, canBeLower).filter(dimension => dimension === 'fluid' || dimension[0] <= width);

      if (fluid && !availableDimensions.find(dimension => dimension === 'fluid')) {
        availableDimensions.push('fluid');
      } // do nothink


      if (JSON.stringify(targeting) === JSON.stringify(this.currentTargeting) && JSON.stringify(availableDimensions) === JSON.stringify(this.currentDimensions)) {
        return;
      }

      this.currentTargeting = targeting;
      this.currentDimensions = availableDimensions; // remove current slot because dimensions is changed and current slot is old

      this.removeSlot(); // there is nothink to display

      if (!availableDimensions || !availableDimensions.length) {
        return;
      } // prepare new node content


      const adId = id || getNextId();
      node.innerHTML = `<div id="${adId}"></div>`; // prepare new slot

      const slot = googletag.defineSlot(props.path, availableDimensions, adId);
      this.slot = slot; // set targeting

      if (targeting) {
        Object.keys(targeting).forEach(key => {
          slot.setTargeting(key, targeting[key]);
        });
      } // set collapsing


      if (typeof collapseEmpty !== 'undefined') {
        const args = Array.isArray(collapseEmpty) ? collapseEmpty : [collapseEmpty];
        slot.setCollapseEmptyDiv(...args);
      }

      slot.addService(googletag.pubads()); // display new slot

      googletag.display(adId);
      googletag.pubads().refresh([slot]);
    }, this.props.resizeDebounce));
    (0, _defineProperty2.default)(this, "handleNode", node => {
      this.node = node;
      this.update(this.props);
    });
  }

  componentDidMount() {
    const {
      path,
      onImpressionViewable,
      onSlotRenderEnded,
      onSlotVisibilityChanged
    } = this.props;
    const options = {
      path,
      onImpressionViewable,
      onSlotRenderEnded,
      onSlotVisibilityChanged
    };
    initGooglePublisherTag(options, googletag => {
      this.googletag = googletag;
      this.update(this.props);
    });
  }

  componentWillReceiveProps(props) {
    this.update(props);
  }

  componentWillUnmount() {
    this.removeSlot();
  }

  removeSlot() {
    const {
      slot,
      googletag,
      node
    } = this;

    if (slot && googletag) {
      googletag.destroySlots([slot]);
      this.slot = null;

      if (node) {
        node.innerHTML = null;
      }
    }
  }

  refreshSlot() {
    const {
      slot,
      googletag
    } = this;

    if (slot && googletag) {
      googletag.pubads().refresh([slot]);
    }
  }

  render() {
    return /*#__PURE__*/_react.default.createElement(_reactMeasure.default, {
      onResize: this.handleResize,
      bounds: true
    }, ({
      measureRef
    }) => /*#__PURE__*/_react.default.createElement("div", {
      ref: measureRef
    }, /*#__PURE__*/_react.default.createElement("div", {
      ref: this.handleNode
    })));
  }

}

exports.default = GooglePublisherTag;
GooglePublisherTag.defaultProps = {
  id: undefined,
  format: _Format.default.MOBILE_HORIZONTAL,
  canBeLower: true,
  enableSingleRequest: false,
  dimensions: undefined,
  targeting: undefined,
  resizeDebounce: 100,
  onSlotRenderEnded: undefined,
  onSlotVisibilityChanged: undefined,
  onImpressionViewable: undefined,
  collapseEmpty: false,
  fluid: false
};
//# sourceMappingURL=GooglePublisherTag.js.map