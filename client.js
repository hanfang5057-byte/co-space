window.__ModuleLoader__.load({
  id: '@local/dsh-space',
  factory(require) {
    const module = { exports: {} };
    (function (module, exports, require) {
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js
var require_use_sync_external_store_shim_production = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js"(exports) {
    "use strict";
    var React2 = require("react");
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var useState2 = React2.useState;
    var useEffect2 = React2.useEffect;
    var useLayoutEffect = React2.useLayoutEffect;
    var useDebugValue = React2.useDebugValue;
    function useSyncExternalStore$2(subscribe, getSnapshot) {
      var value = getSnapshot(), _useState = useState2({ inst: { value, getSnapshot } }), inst = _useState[0].inst, forceUpdate = _useState[1];
      useLayoutEffect(
        function() {
          inst.value = value;
          inst.getSnapshot = getSnapshot;
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        },
        [subscribe, value, getSnapshot]
      );
      useEffect2(
        function() {
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          return subscribe(function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          });
        },
        [subscribe]
      );
      useDebugValue(value);
      return value;
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function useSyncExternalStore$1(subscribe, getSnapshot) {
      return getSnapshot();
    }
    var shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
    exports.useSyncExternalStore = void 0 !== React2.useSyncExternalStore ? React2.useSyncExternalStore : shim;
  }
});

// node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/use-sync-external-store/shim/index.js"(exports, module2) {
    "use strict";
    if (true) {
      module2.exports = require_use_sync_external_store_shim_production();
    } else {
      module2.exports = null;
    }
  }
});

// client-src/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react62 = __toESM(require("react"), 1);

// node_modules/react-aria/dist/private/utils/chain.mjs
function $a4e76a5424781910$export$e08e3b67e392101e(...callbacks) {
  return (...args) => {
    for (let callback of callbacks) if (typeof callback === "function") callback(...args);
  };
}

// node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
var import_react = __toESM(require("react"), 1);
var $c4867b2f328c2698$export$e5c5a5f917a5871c = typeof document !== "undefined" ? (0, import_react.default).useLayoutEffect : () => {
};

// node_modules/react-aria/dist/private/ssr/SSRProvider.mjs
var import_react2 = __toESM(require("react"), 1);
var $c7eafbbe1ea5834e$var$defaultContext = {
  prefix: String(Math.round(Math.random() * 1e10)),
  current: 0
};
var $c7eafbbe1ea5834e$var$SSRContext = /* @__PURE__ */ (0, import_react2.default).createContext($c7eafbbe1ea5834e$var$defaultContext);
var $c7eafbbe1ea5834e$var$IsSSRContext = /* @__PURE__ */ (0, import_react2.default).createContext(false);
var $c7eafbbe1ea5834e$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
var $c7eafbbe1ea5834e$var$componentIds = /* @__PURE__ */ new WeakMap();
function $c7eafbbe1ea5834e$var$useCounter(isDisabled = false) {
  let ctx = (0, import_react2.useContext)($c7eafbbe1ea5834e$var$SSRContext);
  let ref = (0, import_react2.useRef)(null);
  if (ref.current === null && !isDisabled) {
    let currentOwner = (
      // @ts-ignore
      (0, import_react2.default).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current
    );
    if (currentOwner) {
      let prevComponentValue = $c7eafbbe1ea5834e$var$componentIds.get(currentOwner);
      if (prevComponentValue == null)
        $c7eafbbe1ea5834e$var$componentIds.set(currentOwner, {
          id: ctx.current,
          state: currentOwner.memoizedState
        });
      else if (currentOwner.memoizedState !== prevComponentValue.state) {
        ctx.current = prevComponentValue.id;
        $c7eafbbe1ea5834e$var$componentIds.delete(currentOwner);
      }
    }
    ref.current = ++ctx.current;
  }
  return ref.current;
}
function $c7eafbbe1ea5834e$var$useLegacySSRSafeId(defaultId) {
  let ctx = (0, import_react2.useContext)($c7eafbbe1ea5834e$var$SSRContext);
  if (ctx === $c7eafbbe1ea5834e$var$defaultContext && !$c7eafbbe1ea5834e$var$canUseDOM && false) console.warn("When server rendering, you must wrap your application in an <SSRProvider> to ensure consistent ids are generated between the client and server.");
  let counter = $c7eafbbe1ea5834e$var$useCounter(!!defaultId);
  let prefix = ctx === $c7eafbbe1ea5834e$var$defaultContext && false ? "react-aria" : `react-aria${ctx.prefix}`;
  return defaultId || `${prefix}-${counter}`;
}
function $c7eafbbe1ea5834e$var$useModernSSRSafeId(defaultId) {
  let id = (0, import_react2.default).useId();
  let [didSSR] = (0, import_react2.useState)($c7eafbbe1ea5834e$export$535bd6ca7f90a273());
  let prefix = didSSR || false ? "react-aria" : `react-aria${$c7eafbbe1ea5834e$var$defaultContext.prefix}`;
  return defaultId || `${prefix}-${id}`;
}
var $c7eafbbe1ea5834e$export$619500959fc48b26 = typeof (0, import_react2.default)["useId"] === "function" ? $c7eafbbe1ea5834e$var$useModernSSRSafeId : $c7eafbbe1ea5834e$var$useLegacySSRSafeId;
function $c7eafbbe1ea5834e$var$getSnapshot() {
  return false;
}
function $c7eafbbe1ea5834e$var$getServerSnapshot() {
  return true;
}
function $c7eafbbe1ea5834e$var$subscribe(onStoreChange) {
  return () => {
  };
}
function $c7eafbbe1ea5834e$export$535bd6ca7f90a273() {
  if (typeof (0, import_react2.default)["useSyncExternalStore"] === "function")
    return (0, import_react2.default)["useSyncExternalStore"]($c7eafbbe1ea5834e$var$subscribe, $c7eafbbe1ea5834e$var$getSnapshot, $c7eafbbe1ea5834e$var$getServerSnapshot);
  return (0, import_react2.useContext)($c7eafbbe1ea5834e$var$IsSSRContext);
}

// node_modules/react-aria/dist/private/utils/useValueEffect.mjs
var import_react3 = require("react");
function $1a716630a9e3a599$export$14d238f342723f25(defaultValue) {
  let [value, setValue] = (0, import_react3.useState)(defaultValue);
  let currValue = (0, import_react3.useRef)(value);
  let effect = (0, import_react3.useRef)(null);
  let nextRef = (0, import_react3.useRef)(() => {
    if (!effect.current) return;
    let newValue = effect.current.next();
    if (newValue.done) {
      effect.current = null;
      return;
    }
    if (currValue.current === newValue.value) nextRef.current();
    else setValue(newValue.value);
  });
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    currValue.current = value;
    if (effect.current) nextRef.current();
  });
  let queue = (0, import_react3.useCallback)((fn) => {
    effect.current = fn(currValue.current);
    nextRef.current();
  }, [
    nextRef
  ]);
  return [
    value,
    queue
  ];
}

// node_modules/react-aria/dist/private/utils/useId.mjs
var import_react4 = require("react");
var $390e54f620492c70$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
var $390e54f620492c70$export$d41a04c74483c6ef = /* @__PURE__ */ new Map();
var $390e54f620492c70$var$registry;
if (typeof FinalizationRegistry !== "undefined") $390e54f620492c70$var$registry = new FinalizationRegistry((heldValue) => {
  $390e54f620492c70$export$d41a04c74483c6ef.delete(heldValue);
});
var $390e54f620492c70$var$registeredIds = /* @__PURE__ */ new WeakMap();
function $390e54f620492c70$export$f680877a34711e37(defaultId) {
  let [value, setValue] = (0, import_react4.useState)(defaultId);
  let nextId = (0, import_react4.useRef)(null);
  let res = (0, $c7eafbbe1ea5834e$export$619500959fc48b26)(value);
  let cleanupRef = (0, import_react4.useRef)(null);
  let registeredId = $390e54f620492c70$var$registeredIds.get(cleanupRef);
  if ($390e54f620492c70$var$registry && registeredId !== res) {
    if (registeredId != null)
      $390e54f620492c70$var$registry.unregister(cleanupRef);
    $390e54f620492c70$var$registry.register(cleanupRef, res, cleanupRef);
    $390e54f620492c70$var$registeredIds.set(cleanupRef, res);
  }
  if ($390e54f620492c70$var$canUseDOM) {
    const cacheIdRef = $390e54f620492c70$export$d41a04c74483c6ef.get(res);
    if (cacheIdRef && !cacheIdRef.includes(nextId))
      cacheIdRef.push(nextId);
    else
      $390e54f620492c70$export$d41a04c74483c6ef.set(res, [
        nextId
      ]);
  }
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let r2 = res;
    return () => {
      if ($390e54f620492c70$var$registry) {
        $390e54f620492c70$var$registry.unregister(cleanupRef);
        $390e54f620492c70$var$registeredIds.delete(cleanupRef);
      }
      $390e54f620492c70$export$d41a04c74483c6ef.delete(r2);
    };
  }, [
    res
  ]);
  (0, import_react4.useEffect)(() => {
    let newId = nextId.current;
    if (newId) setValue(newId);
    return () => {
      if (newId) nextId.current = null;
    };
  });
  return res;
}
function $390e54f620492c70$export$cd8c9cb68f842629(idA, idB) {
  if (idA === idB) return idA;
  let setIdsA = $390e54f620492c70$export$d41a04c74483c6ef.get(idA);
  if (setIdsA) {
    setIdsA.forEach((ref) => ref.current = idB);
    return idB;
  }
  let setIdsB = $390e54f620492c70$export$d41a04c74483c6ef.get(idB);
  if (setIdsB) {
    setIdsB.forEach((ref) => ref.current = idA);
    return idA;
  }
  return idB;
}
function $390e54f620492c70$export$b4cc09c592e8fdb8(depArray = []) {
  let id = $390e54f620492c70$export$f680877a34711e37();
  let [resolvedId, setResolvedId] = (0, $1a716630a9e3a599$export$14d238f342723f25)(id);
  let updateId = (0, import_react4.useCallback)(() => {
    setResolvedId(function* () {
      yield id;
      yield document.getElementById(id) ? id : void 0;
    });
  }, [
    id,
    setResolvedId
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(updateId, [
    id,
    updateId,
    ...depArray
  ]);
  return resolvedId;
}

// node_modules/react-aria/dist/private/utils/mergeRefs.mjs
function $4064df0d6f9620e1$export$c9058316764c140e(...refs) {
  if (refs.length === 1 && refs[0]) return refs[0];
  return (value) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = $4064df0d6f9620e1$var$setRef(ref, value);
      hasCleanup || (hasCleanup = typeof cleanup == "function");
      return cleanup;
    });
    if (hasCleanup) return () => {
      cleanups.forEach((cleanup, i) => {
        if (typeof cleanup === "function") cleanup();
        else $4064df0d6f9620e1$var$setRef(refs[i], null);
      });
    };
  };
}
function $4064df0d6f9620e1$var$setRef(ref, value) {
  if (typeof ref === "function") return ref(value);
  else if (ref != null) ref.current = value;
}

// node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
var clsx_default = clsx;

// node_modules/react-aria/dist/private/utils/mergeProps.mjs
function $bbaa08b3cd72f041$export$9d1611c77c2fe928(...args) {
  let result = {
    ...args[0]
  };
  for (let i = 1; i < args.length; i++) {
    let props = args[i];
    for (let key in props) {
      let a = result[key];
      let b = props[key];
      if (typeof a === "function" && typeof b === "function" && // This is a lot faster than a regex.
      key[0] === "o" && key[1] === "n" && key.charCodeAt(2) >= /* 'A' */
      65 && key.charCodeAt(2) <= /* 'Z' */
      90) result[key] = (0, $a4e76a5424781910$export$e08e3b67e392101e)(a, b);
      else if ((key === "className" || key === "UNSAFE_className") && typeof a === "string" && typeof b === "string") result[key] = (0, clsx_default)(a, b);
      else if (key === "id" && a && b) result.id = (0, $390e54f620492c70$export$cd8c9cb68f842629)(a, b);
      else if (key === "ref" && a && b) result.ref = (0, $4064df0d6f9620e1$export$c9058316764c140e)(a, b);
      else result[key] = b !== void 0 ? b : a;
    }
  }
  return result;
}

// node_modules/react-aria-components/dist/private/utils.mjs
var import_react6 = __toESM(require("react"), 1);

// node_modules/react-aria/dist/private/utils/useObjectRef.mjs
var import_react5 = require("react");
function $03e8ab2d84d7657a$export$4338b53315abf666(ref) {
  const objRef = (0, import_react5.useRef)(null);
  const cleanupRef = (0, import_react5.useRef)(void 0);
  const refEffect = (0, import_react5.useCallback)((instance) => {
    if (typeof ref === "function") {
      const refCallback = ref;
      const refCleanup = refCallback(instance);
      return () => {
        if (typeof refCleanup === "function") refCleanup();
        else refCallback(null);
      };
    } else if (ref) {
      ref.current = instance;
      return () => {
        ref.current = null;
      };
    }
  }, [
    ref
  ]);
  return (0, import_react5.useMemo)(
    () => ({
      get current() {
        return objRef.current;
      },
      set current(value) {
        objRef.current = value;
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = void 0;
        }
        if (value != null) cleanupRef.current = refEffect(value);
      }
    }),
    // oxlint-disable-next-line react/react-compiler
    [
      refEffect
    ]
  );
}

// node_modules/react-aria-components/dist/private/utils.mjs
var $7230ffa83bc0c2cf$export$c62b8e45d58ddad9 = Symbol("default");
function $7230ffa83bc0c2cf$export$2881499e37b75b9a({ values, children }) {
  for (let [Context, value] of values)
    children = /* @__PURE__ */ (0, import_react6.default).createElement(Context.Provider, {
      value
    }, children);
  return children;
}
function $7230ffa83bc0c2cf$export$4d86445c2cf5e3(props) {
  let { className, style, children, defaultClassName, defaultChildren, defaultStyle, values, render } = props;
  return (0, import_react6.useMemo)(() => {
    let computedClassName;
    let computedStyle;
    let computedChildren;
    if (typeof className === "function") computedClassName = className({
      ...values,
      defaultClassName
    });
    else computedClassName = className;
    if (typeof style === "function") computedStyle = style({
      ...values,
      defaultStyle: defaultStyle || {}
    });
    else computedStyle = style;
    if (typeof children === "function") computedChildren = children({
      ...values,
      defaultChildren
    });
    else if (children == null) computedChildren = defaultChildren;
    else computedChildren = children;
    return {
      className: computedClassName ?? defaultClassName,
      style: computedStyle || defaultStyle ? {
        ...defaultStyle,
        ...computedStyle
      } : void 0,
      children: computedChildren ?? defaultChildren,
      "data-rac": "",
      render: render ? (props2) => render(props2, values) : void 0
    };
  }, [
    className,
    style,
    children,
    defaultClassName,
    defaultChildren,
    defaultStyle,
    values,
    render
  ]);
}
function $7230ffa83bc0c2cf$export$fabf2dc03a41866e(context, slot) {
  let ctx = (0, import_react6.useContext)(context);
  if (slot === null)
    return null;
  if (ctx && typeof ctx === "object" && "slots" in ctx && ctx.slots) {
    let slotKey = slot || $7230ffa83bc0c2cf$export$c62b8e45d58ddad9;
    if (!ctx.slots[slotKey]) {
      let availableSlots = new Intl.ListFormat().format(Object.keys(ctx.slots).map((p) => `"${p}"`));
      let errorMessage = slot ? `Invalid slot "${slot}".` : "A slot prop is required.";
      throw new Error(`${errorMessage} Valid slot names are ${availableSlots}.`);
    }
    return ctx.slots[slotKey];
  }
  return ctx;
}
function $7230ffa83bc0c2cf$export$29f1550f4b0d4415(props, ref, context) {
  let ctx = $7230ffa83bc0c2cf$export$fabf2dc03a41866e(context, props.slot) || {};
  let { ref: contextRef, ...contextProps } = ctx;
  let mergedRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)((0, import_react6.useMemo)(() => (0, $4064df0d6f9620e1$export$c9058316764c140e)(ref, contextRef), [
    ref,
    contextRef
  ]));
  let mergedProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(contextProps, props);
  if ("style" in contextProps && contextProps.style && "style" in props && props.style) {
    if (typeof contextProps.style === "function" || typeof props.style === "function")
      mergedProps.style = (renderProps) => {
        let contextStyle = typeof contextProps.style === "function" ? contextProps.style(renderProps) : contextProps.style;
        let defaultStyle = {
          ...renderProps.defaultStyle,
          ...contextStyle
        };
        let style = typeof props.style === "function" ? props.style({
          ...renderProps,
          defaultStyle
        }) : props.style;
        return {
          ...defaultStyle,
          ...style
        };
      };
    else
      mergedProps.style = {
        ...contextProps.style,
        ...props.style
      };
  }
  return [
    mergedProps,
    mergedRef
  ];
}
function $7230ffa83bc0c2cf$var$DOMElement(ElementType, props, forwardedRef) {
  let { render, ...otherProps } = props;
  let elementRef = (0, import_react6.useRef)(null);
  let ref = (0, import_react6.useMemo)(() => (0, $4064df0d6f9620e1$export$c9058316764c140e)(forwardedRef, elementRef), [
    forwardedRef,
    elementRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (false) {
      if (!elementRef.current) console.warn("Ref was not connected to DOM element returned by custom `render` function. Did you forget to pass through or merge the `ref`?");
      else if (elementRef.current.localName !== ElementType) console.warn(`Unexpected DOM element returned by custom \`render\` function. Expected <${ElementType}>, got <${elementRef.current.localName}>. This may break the component behavior and accessibility.`);
    }
  }, [
    ElementType,
    render
  ]);
  let domProps = {
    ...otherProps,
    ref
  };
  if (render) return render(domProps, void 0);
  return /* @__PURE__ */ (0, import_react6.default).createElement(ElementType, domProps);
}
var $7230ffa83bc0c2cf$var$domComponentCache = {};
var $7230ffa83bc0c2cf$export$df3a06d6289f983e = new Proxy({}, {
  get(target, elementType) {
    if (typeof elementType !== "string") return void 0;
    let res = $7230ffa83bc0c2cf$var$domComponentCache[elementType];
    if (!res) {
      res = /* @__PURE__ */ (0, import_react6.forwardRef)($7230ffa83bc0c2cf$var$DOMElement.bind(null, elementType));
      $7230ffa83bc0c2cf$var$domComponentCache[elementType] = res;
    }
    return res;
  }
});

// node_modules/react-aria/dist/private/utils/constants.mjs
var $8b2399d051d06d4c$export$447a38995de2c711 = "react-aria-clear-focus";
var $8b2399d051d06d4c$export$831c820ad60f9d12 = "react-aria-focus";

// node_modules/react-aria/dist/private/utils/domHelpers.mjs
var $d447af545b77c9f1$export$b204af158042fbac = (target) => {
  if ($d447af545b77c9f1$var$isWindow(target)) return target.document;
  if ($d447af545b77c9f1$export$62858bae88b53fd0(target)) return target;
  return target?.ownerDocument ?? (typeof document !== "undefined" ? document : void 0);
};
var $d447af545b77c9f1$export$f21a1ffae260145a = (target) => {
  let ownerDocument = $d447af545b77c9f1$export$b204af158042fbac(target);
  return ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : void 0);
};
function $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) {
  return value !== null && typeof value === "object" && "nodeType" in value && typeof value.nodeType === "number";
}
function $d447af545b77c9f1$var$isWindow(value) {
  return typeof value === "object" && value != null && "window" in value && value.window === value;
}
function $d447af545b77c9f1$export$62858bae88b53fd0(value) {
  return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 9;
}
function $d447af545b77c9f1$export$af51f0f06c0f328a(value) {
  return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 11 && "host" in value;
}
function $d447af545b77c9f1$export$f531f92e2a15358f(target, event, listener, options) {
  if (listener == null || target == null) return () => {
  };
  let eventTargets = Array.isArray(target) ? target : [
    target
  ];
  for (let eventTarget of eventTargets) eventTarget.addEventListener(event, listener, options);
  return () => {
    for (let eventTarget of eventTargets) eventTarget.removeEventListener(event, listener, options);
  };
}
function $d447af545b77c9f1$export$37a5fde709c1db82(target, property, value, priority) {
  if (target == null) return () => {
  };
  let restore = new Array();
  let styleTargets = Array.isArray(target) ? target : [
    target
  ];
  for (let styleTarget of styleTargets) {
    let initialValue = styleTarget.style.getPropertyValue(property);
    let initialPriority = styleTarget.style.getPropertyPriority(property);
    styleTarget.style.setProperty(property, value, priority);
    restore.unshift(() => {
      if (initialValue) styleTarget.style.setProperty(property, initialValue, initialPriority);
      else styleTarget.style.removeProperty(property);
    });
  }
  return () => {
    for (let cleanup of restore) cleanup();
  };
}

// node_modules/react-stately/dist/private/flags/flags.mjs
var $6a20a7989e6c817a$var$_shadowDOM = false;
function $6a20a7989e6c817a$export$98658e8c59125e6a() {
  return $6a20a7989e6c817a$var$_shadowDOM;
}

// node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
function $23f2114a1b82827e$export$4282f70798064fe0(node, otherNode) {
  if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return otherNode && node ? node.contains(otherNode) : false;
  if (!node || !otherNode) return false;
  let currentNode = otherNode;
  while (currentNode != null) {
    if (currentNode === node) return true;
    if (typeof currentNode.assignedElements !== "function" && currentNode.assignedSlot?.parentNode)
      currentNode = currentNode.assignedSlot.parentNode;
    else if ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(currentNode))
      currentNode = currentNode.host;
    else currentNode = currentNode.parentNode;
  }
  return false;
}
var $23f2114a1b82827e$export$cd4e5573fbe2b576 = (doc = document) => {
  if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return doc.activeElement;
  let activeElement = doc.activeElement;
  while (activeElement && "shadowRoot" in activeElement && activeElement.shadowRoot?.activeElement) activeElement = activeElement.shadowRoot.activeElement;
  return activeElement;
};
function $23f2114a1b82827e$export$e58f029f0fbfdb29(event) {
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)() && event.target instanceof Element && event.target.shadowRoot) {
    if ("composedPath" in event) return event.composedPath()[0] ?? null;
    else if ("composedPath" in event.nativeEvent) return event.nativeEvent.composedPath()[0] ?? null;
  }
  return event.target;
}
function $23f2114a1b82827e$export$b4f377a2b6254582(node) {
  if (!node) return false;
  let root = node.getRootNode();
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node);
  if (!(root instanceof ownerWindow.Document || root instanceof ownerWindow.ShadowRoot)) return false;
  let activeElement = root.activeElement;
  return activeElement != null && node.contains(activeElement);
}

// node_modules/react-aria/dist/private/focus/virtualFocus.mjs
function $b72f3f7b3b5f42c6$export$76e4e37e5339496d(to) {
  let from = $b72f3f7b3b5f42c6$export$759df0d867455a91((0, $d447af545b77c9f1$export$b204af158042fbac)(to));
  if (from !== to) {
    if (from) $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to);
    if (to) $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from);
  }
}
function $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to) {
  from.dispatchEvent(new FocusEvent("blur", {
    relatedTarget: to
  }));
  from.dispatchEvent(new FocusEvent("focusout", {
    bubbles: true,
    relatedTarget: to
  }));
}
function $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from) {
  to.dispatchEvent(new FocusEvent("focus", {
    relatedTarget: from
  }));
  to.dispatchEvent(new FocusEvent("focusin", {
    bubbles: true,
    relatedTarget: from
  }));
}
function $b72f3f7b3b5f42c6$export$759df0d867455a91(document2) {
  let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(document2);
  let activeDescendant = activeElement?.getAttribute("aria-activedescendant");
  if (activeDescendant) return document2.getElementById(activeDescendant) || activeElement;
  return activeElement;
}

// node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
function $1969ac565cfec8d0$export$de79e2c695e052f3(element) {
  element.focus({
    preventScroll: true
  });
}

// node_modules/react-aria/dist/private/utils/isElementVisible.mjs
var $ae77152785188400$var$supportsCheckVisibility = typeof Element !== "undefined" && "checkVisibility" in Element.prototype;
function $ae77152785188400$var$isStyleVisible(element) {
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  if (!(element instanceof windowObject.HTMLElement) && !(element instanceof windowObject.SVGElement)) return false;
  let { display, visibility } = element.style;
  let isVisible = display !== "none" && visibility !== "hidden" && visibility !== "collapse";
  if (isVisible) {
    const { getComputedStyle } = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    let { display: computedDisplay, visibility: computedVisibility } = getComputedStyle(element);
    isVisible = computedDisplay !== "none" && computedVisibility !== "hidden" && computedVisibility !== "collapse";
  }
  return isVisible;
}
function $ae77152785188400$var$isAttributeVisible(element, childElement) {
  return !element.hasAttribute("hidden") && // Ignore HiddenSelect when tree walking.
  !element.hasAttribute("data-react-aria-prevent-focus") && (element.nodeName === "DETAILS" && childElement && childElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : true);
}
function $ae77152785188400$export$e989c0fffaa6b27a(element, childElement) {
  if ($ae77152785188400$var$supportsCheckVisibility) return element.checkVisibility({
    visibilityProperty: true
  }) && !element.closest("[data-react-aria-prevent-focus]");
  return element.nodeName !== "#comment" && $ae77152785188400$var$isStyleVisible(element) && $ae77152785188400$var$isAttributeVisible(element, childElement) && (!element.parentElement || $ae77152785188400$export$e989c0fffaa6b27a(element.parentElement, element));
}

// node_modules/react-aria/dist/private/utils/isFocusable.mjs
var $3b8b240c1bf84ab9$var$focusableElements = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission"
];
var $3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(":not([hidden]),") + ",[tabindex]:not([disabled]):not([hidden])";
$3b8b240c1bf84ab9$var$focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');
var $3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(':not([hidden]):not([tabindex="-1"]),');
function $3b8b240c1bf84ab9$export$4c063cf1350e6fed(element, options) {
  return element.matches($3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR) && !$3b8b240c1bf84ab9$var$isInert(element) && (options?.skipVisibilityCheck || (0, $ae77152785188400$export$e989c0fffaa6b27a)(element));
}
function $3b8b240c1bf84ab9$export$bebd5a1431fec25d(element) {
  return element.matches($3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR) && (0, $ae77152785188400$export$e989c0fffaa6b27a)(element) && !$3b8b240c1bf84ab9$var$isInert(element);
}
function $3b8b240c1bf84ab9$var$isInert(element) {
  let node = element;
  while (node != null) {
    if (node instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node).HTMLElement && node.inert) return true;
    node = node.parentElement;
  }
  return false;
}

// node_modules/react-aria/dist/private/interactions/utils.mjs
var import_react7 = require("react");
function $a92dc41f639950be$export$525bc4921d56d4a(nativeEvent) {
  let event = nativeEvent;
  event.nativeEvent = nativeEvent;
  event.isDefaultPrevented = () => event.defaultPrevented;
  event.isPropagationStopped = () => event.cancelBubble;
  event.persist = () => {
  };
  return event;
}
function $a92dc41f639950be$export$c2b7abe5d61ec696(event, target) {
  Object.defineProperty(event, "target", {
    value: target
  });
  Object.defineProperty(event, "currentTarget", {
    value: target
  });
}
function $a92dc41f639950be$export$715c682d09d639cc(onBlur) {
  let stateRef = (0, import_react7.useRef)({
    isFocused: false,
    observer: null
  });
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const state = stateRef.current;
    return () => {
      if (state.observer) {
        state.observer.disconnect();
        state.observer = null;
      }
    };
  }, []);
  return (0, import_react7.useCallback)((e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (eventTarget instanceof HTMLButtonElement || eventTarget instanceof HTMLInputElement || eventTarget instanceof HTMLTextAreaElement || eventTarget instanceof HTMLSelectElement) {
      stateRef.current.isFocused = true;
      let target = eventTarget;
      let onBlurHandler = (e2) => {
        stateRef.current.isFocused = false;
        if (target.disabled) {
          let event = $a92dc41f639950be$export$525bc4921d56d4a(e2);
          onBlur?.(event);
        }
        if (stateRef.current.observer) {
          stateRef.current.observer.disconnect();
          stateRef.current.observer = null;
        }
      };
      target.addEventListener("focusout", onBlurHandler, {
        once: true
      });
      stateRef.current.observer = new MutationObserver(() => {
        if (stateRef.current.isFocused && target.disabled) {
          stateRef.current.observer?.disconnect();
          let relatedTargetEl = target === (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() ? null : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
          target.dispatchEvent(new FocusEvent("blur", {
            relatedTarget: relatedTargetEl
          }));
          target.dispatchEvent(new FocusEvent("focusout", {
            bubbles: true,
            relatedTarget: relatedTargetEl
          }));
        }
      });
      stateRef.current.observer.observe(target, {
        attributes: true,
        attributeFilter: [
          "disabled"
        ]
      });
    }
  }, [
    onBlur
  ]);
}
var $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
function $a92dc41f639950be$export$cabe61c495ee3649(target) {
  while (target && !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(target, {
    skipVisibilityCheck: true
  })) target = target.parentElement;
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
  let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerWindow.document);
  if (!activeElement || activeElement === target) return;
  let targetRoot = target?.getRootNode();
  let root = targetRoot != null && (0, $d447af545b77c9f1$export$af51f0f06c0f328a)(targetRoot) ? targetRoot : (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
  let isFocusMovingToTarget = (focusTarget) => focusTarget === target || (0, $d447af545b77c9f1$export$8ee0fc9ee280b4ee)(focusTarget) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(target, focusTarget);
  let isBlurFromActiveElement = (eventTarget) => eventTarget === activeElement || activeElement != null && (0, $d447af545b77c9f1$export$8ee0fc9ee280b4ee)(eventTarget) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(activeElement, eventTarget);
  $a92dc41f639950be$export$fda7da73ab5d4c48 = true;
  let isRefocusing = false;
  let onBlur = (e) => {
    if (isBlurFromActiveElement((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || isRefocusing) e.stopImmediatePropagation();
  };
  let onFocusOut = (e) => {
    if (isBlurFromActiveElement((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || isRefocusing) {
      e.stopImmediatePropagation();
      if (!target && !isRefocusing) {
        isRefocusing = true;
        (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
        cleanup();
      }
    }
  };
  let onFocus = (e) => {
    if (isFocusMovingToTarget((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || isRefocusing) e.stopImmediatePropagation();
  };
  let onFocusIn = (e) => {
    if (isFocusMovingToTarget((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || isRefocusing) {
      e.stopImmediatePropagation();
      if (!isRefocusing) {
        isRefocusing = true;
        (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
        cleanup();
      }
    }
  };
  root.addEventListener("blur", onBlur, true);
  root.addEventListener("focusout", onFocusOut, true);
  root.addEventListener("focusin", onFocusIn, true);
  root.addEventListener("focus", onFocus, true);
  let cleanup = () => {
    cancelAnimationFrame(raf);
    root.removeEventListener("blur", onBlur, true);
    root.removeEventListener("focusout", onFocusOut, true);
    root.removeEventListener("focusin", onFocusIn, true);
    root.removeEventListener("focus", onFocus, true);
    $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
    isRefocusing = false;
  };
  let raf = requestAnimationFrame(cleanup);
  return cleanup;
}

// node_modules/react-aria/dist/private/utils/platform.mjs
function $2add3ce32c6007eb$var$testUserAgent(re) {
  if (typeof window === "undefined" || window.navigator == null) return false;
  let brands = window.navigator["userAgentData"]?.brands;
  return Array.isArray(brands) && brands.some((brand) => re.test(brand.brand)) || re.test(window.navigator.userAgent);
}
function $2add3ce32c6007eb$var$testPlatform(re) {
  return typeof window !== "undefined" && window.navigator != null ? re.test(window.navigator["userAgentData"]?.platform || window.navigator.platform) : false;
}
function $2add3ce32c6007eb$var$cached(fn) {
  if (false) return fn;
  let res = null;
  return () => {
    if (res == null) res = fn();
    return res;
  };
}
var $2add3ce32c6007eb$export$9ac100e40613ea10 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^Mac/i);
});
var $2add3ce32c6007eb$export$186c6964ca17d99 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^iPhone/i);
});
var $2add3ce32c6007eb$export$7bef049ce92e4224 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  $2add3ce32c6007eb$export$9ac100e40613ea10() && navigator.maxTouchPoints > 1;
});
var $2add3ce32c6007eb$export$fedb369cb70207f1 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$186c6964ca17d99() || $2add3ce32c6007eb$export$7bef049ce92e4224();
});
var $2add3ce32c6007eb$export$e1865c3bedcd822b = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$9ac100e40613ea10() || $2add3ce32c6007eb$export$fedb369cb70207f1();
});
var $2add3ce32c6007eb$export$78551043582a6a98 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/AppleWebKit/i) && ($2add3ce32c6007eb$export$fedb369cb70207f1() || !$2add3ce32c6007eb$export$6446a186d09e379e());
});
var $2add3ce32c6007eb$export$95df08bae54cb4df = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$export$78551043582a6a98() && !$2add3ce32c6007eb$export$6446a186d09e379e() && !$2add3ce32c6007eb$export$b7d78993b74f766d();
});
var $2add3ce32c6007eb$export$6446a186d09e379e = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/Chrome|CriOS|CrMo/i);
});
var $2add3ce32c6007eb$export$a11b0059900ceec8 = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/Android/i);
});
var $2add3ce32c6007eb$export$b7d78993b74f766d = $2add3ce32c6007eb$var$cached(function() {
  return $2add3ce32c6007eb$var$testUserAgent(/(Firefox|FxiOS)/i);
});

// node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
function $b5c62b033c25b96d$export$60278871457622de(event) {
  if (event.pointerType === "" && event.isTrusted) return true;
  if ((0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.pointerType) return event.type === "click" && event.buttons === 1;
  return event.detail === 0 && !event.pointerType;
}
function $b5c62b033c25b96d$export$29bf1b5f2c56cf63(event) {
  return !(0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 0 && event.height === 0 || (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "mouse";
}

// node_modules/react-aria/dist/private/utils/openLink.mjs
var import_react8 = __toESM(require("react"), 1);
var $caaf0dd3060ed57c$var$RouterContext = /* @__PURE__ */ (0, import_react8.createContext)({
  isNative: true,
  open: $caaf0dd3060ed57c$var$openSyntheticLink,
  useHref: (href) => href
});
function $caaf0dd3060ed57c$export$9a302a45f65d0572() {
  return (0, import_react8.useContext)($caaf0dd3060ed57c$var$RouterContext);
}
function $caaf0dd3060ed57c$export$95185d699e05d4d7(target, modifiers, setOpening = true) {
  let { metaKey, ctrlKey, altKey, shiftKey } = modifiers;
  let event = (0, $2add3ce32c6007eb$export$78551043582a6a98)() && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && !(0, $2add3ce32c6007eb$export$7bef049ce92e4224)() && true ? new KeyboardEvent("keydown", {
    keyIdentifier: "Enter",
    metaKey,
    ctrlKey,
    altKey,
    shiftKey
  }) : new MouseEvent("click", {
    metaKey,
    ctrlKey,
    altKey,
    shiftKey,
    detail: 1,
    bubbles: true,
    cancelable: true
  });
  $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = setOpening;
  (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(target);
  target.dispatchEvent(event);
  $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
}
$caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
function $caaf0dd3060ed57c$var$getSyntheticLink(target, open) {
  if (target instanceof HTMLAnchorElement) open(target);
  else if (target.hasAttribute("data-href")) {
    let link = document.createElement("a");
    link.href = target.getAttribute("data-href");
    if (target.hasAttribute("data-target")) link.target = target.getAttribute("data-target");
    if (target.hasAttribute("data-rel")) link.rel = target.getAttribute("data-rel");
    if (target.hasAttribute("data-download")) link.download = target.getAttribute("data-download");
    if (target.hasAttribute("data-ping")) link.ping = target.getAttribute("data-ping");
    if (target.hasAttribute("data-referrer-policy")) link.referrerPolicy = target.getAttribute("data-referrer-policy");
    target.appendChild(link);
    open(link);
    target.removeChild(link);
  }
}
function $caaf0dd3060ed57c$var$openSyntheticLink(target, modifiers) {
  $caaf0dd3060ed57c$var$getSyntheticLink(target, (link) => $caaf0dd3060ed57c$export$95185d699e05d4d7(link, modifiers));
}
function $caaf0dd3060ed57c$export$7e924b3091a3bd18(props) {
  let router = $caaf0dd3060ed57c$export$9a302a45f65d0572();
  const href = router.useHref(props?.href ?? "");
  let linkProps = {};
  if (props) {
    for (let key of [
      "href",
      "target",
      "rel",
      "download",
      "ping",
      "referrerPolicy"
    ]) if (key in props && props[key] !== void 0) linkProps[key] = key === "href" ? href : props[key];
  }
  return linkProps;
}

// node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
var import_react9 = require("react");
var $8f5a2122b0992be3$var$currentModality = null;
var $8f5a2122b0992be3$var$currentPointerType = "keyboard";
var $8f5a2122b0992be3$export$901e90a13c50a14e = /* @__PURE__ */ new Set();
var $8f5a2122b0992be3$export$d90243b58daecda7 = /* @__PURE__ */ new Map();
var $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
var $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
var $8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS = {
  Tab: true,
  Escape: true
};
function $8f5a2122b0992be3$var$triggerChangeHandlers(modality, e) {
  for (let handler of $8f5a2122b0992be3$export$901e90a13c50a14e) handler(modality, e);
}
function $8f5a2122b0992be3$var$isValidKey(e) {
  return !(e.metaKey || !(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function $8f5a2122b0992be3$var$handleKeyboardEvent(e) {
  $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
  if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && $8f5a2122b0992be3$var$isValidKey(e)) {
    $8f5a2122b0992be3$var$currentModality = "keyboard";
    $8f5a2122b0992be3$var$currentPointerType = "keyboard";
    $8f5a2122b0992be3$var$triggerChangeHandlers("keyboard", e);
  }
}
function $8f5a2122b0992be3$var$handlePointerEvent(e) {
  $8f5a2122b0992be3$var$currentModality = "pointer";
  $8f5a2122b0992be3$var$currentPointerType = "pointerType" in e ? e.pointerType : "mouse";
  if (e.type === "mousedown" || e.type === "pointerdown") {
    $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
    $8f5a2122b0992be3$var$triggerChangeHandlers("pointer", e);
  }
}
function $8f5a2122b0992be3$var$handleClickEvent(e) {
  if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && (0, $b5c62b033c25b96d$export$60278871457622de)(e)) {
    $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
    $8f5a2122b0992be3$var$currentModality = "virtual";
    $8f5a2122b0992be3$var$currentPointerType = "virtual";
  }
}
function $8f5a2122b0992be3$var$handleFocusEvent(e) {
  if (0, $a92dc41f639950be$export$fda7da73ab5d4c48) return;
  let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
  if (target === ownerWindow) {
    $8f5a2122b0992be3$var$hasBlurredWindowRecently = true;
    return;
  }
  if (target === ownerDocument || !e.isTrusted) return;
  if (!$8f5a2122b0992be3$var$hasEventBeforeFocus && !$8f5a2122b0992be3$var$hasBlurredWindowRecently) {
    $8f5a2122b0992be3$var$currentModality = "virtual";
    $8f5a2122b0992be3$var$currentPointerType = "virtual";
    $8f5a2122b0992be3$var$triggerChangeHandlers("virtual", e);
  }
  $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
  $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
}
function $8f5a2122b0992be3$var$handleWindowBlur() {
  if (0, $a92dc41f639950be$export$fda7da73ab5d4c48) return;
  $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
  $8f5a2122b0992be3$var$hasBlurredWindowRecently = true;
}
function $8f5a2122b0992be3$var$handleInvalidEvent(e) {
  let startingActiveElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)));
  queueMicrotask(() => {
    if ((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) !== startingActiveElement) $8f5a2122b0992be3$export$8397ddfc504fdb9a("keyboard");
  });
}
function $8f5a2122b0992be3$var$setupGlobalFocusEvents(element) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if ($8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject)) return;
  let focus = windowObject.HTMLElement.prototype.focus;
  Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
    configurable: true,
    writable: true,
    value: function() {
      $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
      focus.apply(this, arguments);
    }
  });
  documentObject.addEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.addEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.addEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
  documentObject.addEventListener("invalid", $8f5a2122b0992be3$var$handleInvalidEvent, true);
  windowObject.addEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
  windowObject.addEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
  if (typeof PointerEvent !== "undefined") {
    documentObject.addEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  } else if (false) {
    documentObject.addEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.addEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  }
  windowObject.addEventListener("beforeunload", () => {
    $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element);
  }, {
    once: true
  });
  $8f5a2122b0992be3$export$d90243b58daecda7.set(windowObject, {
    focus
  });
}
var $8f5a2122b0992be3$var$tearDownWindowFocusTracking = (element, loadListener) => {
  const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if (loadListener) documentObject.removeEventListener("DOMContentLoaded", loadListener);
  if (!$8f5a2122b0992be3$export$d90243b58daecda7.has(windowObject)) return;
  Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
    configurable: true,
    writable: true,
    value: $8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject).focus
  });
  documentObject.removeEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.removeEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
  documentObject.removeEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
  documentObject.removeEventListener("invalid", $8f5a2122b0992be3$var$handleInvalidEvent, true);
  windowObject.removeEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
  windowObject.removeEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
  if (typeof PointerEvent !== "undefined") {
    documentObject.removeEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  } else if (false) {
    documentObject.removeEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
    documentObject.removeEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
  }
  $8f5a2122b0992be3$export$d90243b58daecda7.delete(windowObject);
};
function $8f5a2122b0992be3$export$2f1888112f558a7d(element) {
  const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  let loadListener;
  if (documentObject.readyState !== "loading") $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
  else {
    loadListener = () => {
      $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
    };
    documentObject.addEventListener("DOMContentLoaded", loadListener);
  }
  return () => $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element, loadListener);
}
if (typeof document !== "undefined") $8f5a2122b0992be3$export$2f1888112f558a7d();
function $8f5a2122b0992be3$export$b9b3dfddab17db27() {
  return $8f5a2122b0992be3$var$currentModality !== "pointer";
}
function $8f5a2122b0992be3$export$630ff653c5ada6a9() {
  return $8f5a2122b0992be3$var$currentModality;
}
function $8f5a2122b0992be3$export$8397ddfc504fdb9a(modality) {
  $8f5a2122b0992be3$var$currentModality = modality;
  $8f5a2122b0992be3$var$currentPointerType = modality === "pointer" ? "mouse" : modality;
  $8f5a2122b0992be3$var$triggerChangeHandlers(modality, null);
}
var $8f5a2122b0992be3$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $8f5a2122b0992be3$var$isKeyboardFocusEvent(isTextInput, modality, e) {
  let eventTarget = e ? (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) : void 0;
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(eventTarget);
  const IHTMLInputElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLInputElement : HTMLInputElement;
  const IHTMLTextAreaElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLTextAreaElement : HTMLTextAreaElement;
  const IHTMLElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLElement : HTMLElement;
  const IKeyboardEvent = typeof ownerWindow !== "undefined" ? ownerWindow.KeyboardEvent : KeyboardEvent;
  let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
  isTextInput = isTextInput || activeElement instanceof IHTMLInputElement && !$8f5a2122b0992be3$var$nonTextInputTypes.has(activeElement.type) || activeElement instanceof IHTMLTextAreaElement || activeElement instanceof IHTMLElement && activeElement.isContentEditable;
  return !(isTextInput && modality === "keyboard" && e instanceof IKeyboardEvent && !$8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS[e.key]);
}
function $8f5a2122b0992be3$export$ec71b4b83ac08ec3(fn, deps, opts) {
  $8f5a2122b0992be3$var$setupGlobalFocusEvents();
  (0, import_react9.useEffect)(() => {
    if (opts?.enabled === false) return;
    let handler = (modality, e) => {
      if (!$8f5a2122b0992be3$var$isKeyboardFocusEvent(!!opts?.isTextInput, modality, e)) return;
      fn($8f5a2122b0992be3$export$b9b3dfddab17db27());
    };
    $8f5a2122b0992be3$export$901e90a13c50a14e.add(handler);
    return () => {
      $8f5a2122b0992be3$export$901e90a13c50a14e.delete(handler);
    };
  }, deps);
}

// node_modules/react-aria/dist/private/utils/getMetaValue.mjs
function $7096878c21af5e66$export$a929f3f93e2cc67e(key, doc) {
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(doc);
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(doc);
  if (ownerDocument == null || ownerWindow == null) return;
  let content = void 0;
  let selector = `meta[name="${CSS.escape(key)}"], meta[property="${CSS.escape(key)}"]`;
  let meta = ownerDocument.querySelector(selector);
  if (meta && meta instanceof ownerWindow.HTMLMetaElement) {
    if (key === "csp-nonce" && meta.nonce) content ?? (content = meta.nonce || void 0);
    if (meta.content) content ?? (content = meta.content || void 0);
  }
  if (key === "csp-nonce") content ?? (content = ownerWindow.__webpack_nonce__ || globalThis.__webpack_nonce__ || void 0);
  return content;
}

// node_modules/react-aria/dist/private/utils/keyboard.mjs
var $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT = 100;
var $bb39c0fc1c19b34c$var$KEYBOARD_TIMEOUT = 600;
var $bb39c0fc1c19b34c$var$state = {
  isOpen: false,
  screenWidth: 0,
  screenHeight: 0,
  screenAngle: 0,
  screenTimeout: 0,
  startTimeStamp: 0,
  endTimeStamp: 0,
  resizeTimeStamp: 0,
  resizeTimeout: 0
};
var $bb39c0fc1c19b34c$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
if (false) {
  const visualViewport = Object.assign(new EventTarget(), {
    offsetTop: 0,
    offsetLeft: 0,
    pageTop: 0,
    pageLeft: 0,
    scale: 1
  });
  Reflect.defineProperty(visualViewport, "width", {
    get: () => window.innerWidth,
    configurable: true
  });
  Reflect.defineProperty(visualViewport, "height", {
    get: () => window.innerHeight,
    configurable: true
  });
  Reflect.defineProperty(window, "visualViewport", {
    value: visualViewport,
    configurable: true,
    writable: true
  });
}
if (false) {
  const orientation = Object.assign(new EventTarget(), {
    type: "landscape-primary"
  });
  Reflect.defineProperty(window.screen, "orientation", {
    value: orientation,
    configurable: true,
    writable: true
  });
  Reflect.defineProperty(window.screen.orientation, "angle", {
    get: () => window.orientation ?? 0,
    configurable: true
  });
}
function $bb39c0fc1c19b34c$var$getTouchScreen() {
  let screenWidth = Number(window.visualViewport?.width ?? window.innerWidth);
  let screenHeight = Number(window.visualViewport?.height ?? window.innerHeight);
  let visualScale = Number(window.visualViewport?.scale ?? 1);
  return {
    width: screenWidth * visualScale,
    height: screenHeight * visualScale,
    angle: window.screen.orientation?.angle ?? 0
  };
}
function $bb39c0fc1c19b34c$var$onResizeStart(e) {
  if ($bb39c0fc1c19b34c$var$state.resizeTimeStamp <= e.timeStamp + 50) {
    $bb39c0fc1c19b34c$var$state.resizeTimeStamp = e.timeStamp + 150;
    window.clearTimeout($bb39c0fc1c19b34c$var$state.resizeTimeout);
    $bb39c0fc1c19b34c$var$state.resizeTimeout = window.setTimeout($bb39c0fc1c19b34c$var$onResizeEnd, 150);
  }
}
function $bb39c0fc1c19b34c$var$onResizeEnd() {
  let viewportMeta = (0, $7096878c21af5e66$export$a929f3f93e2cc67e)("viewport");
  if ((0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && viewportMeta?.includes("overlays-content")) return;
  let time = performance.now();
  let screen = $bb39c0fc1c19b34c$var$getTouchScreen();
  let elapsed = time - $bb39c0fc1c19b34c$var$state.startTimeStamp;
  let delta = $bb39c0fc1c19b34c$var$state.screenHeight - screen.height;
  let rotation = $bb39c0fc1c19b34c$var$state.screenAngle - screen.angle;
  if (Math.abs(rotation) % 180 && $bb39c0fc1c19b34c$var$state.screenWidth - screen.height < $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT) {
    $bb39c0fc1c19b34c$var$state.screenWidth = screen.width;
    $bb39c0fc1c19b34c$var$state.screenHeight = screen.height;
    $bb39c0fc1c19b34c$var$state.screenAngle = screen.angle;
    delta = 0;
  }
  if (elapsed > $bb39c0fc1c19b34c$var$KEYBOARD_TIMEOUT) {
    window.clearTimeout($bb39c0fc1c19b34c$var$state.screenTimeout);
    $bb39c0fc1c19b34c$var$state.screenTimeout = window.setTimeout(() => {
      let activeElement = document.hasFocus() ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() : null;
      let willKeyboardOpen = $bb39c0fc1c19b34c$export$c57958e35f31ed73(activeElement);
      let screen2 = $bb39c0fc1c19b34c$var$getTouchScreen();
      if (Math.abs($bb39c0fc1c19b34c$var$state.screenAngle - screen2.angle) % 180) return;
      if ($bb39c0fc1c19b34c$var$state.isOpen && willKeyboardOpen) return;
      $bb39c0fc1c19b34c$var$state.screenWidth = screen2.width;
      $bb39c0fc1c19b34c$var$state.screenHeight = screen2.height;
      $bb39c0fc1c19b34c$var$state.screenAngle = screen2.angle;
      $bb39c0fc1c19b34c$var$state.isOpen = false;
    }, $bb39c0fc1c19b34c$var$KEYBOARD_TIMEOUT);
  }
  if (elapsed <= $bb39c0fc1c19b34c$var$KEYBOARD_TIMEOUT && delta >= $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT) $bb39c0fc1c19b34c$var$state.endTimeStamp = time;
  $bb39c0fc1c19b34c$var$state.isOpen = delta >= $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT;
}
function $bb39c0fc1c19b34c$var$onOrientationChange() {
  let screen = $bb39c0fc1c19b34c$var$getTouchScreen();
  let rotation = $bb39c0fc1c19b34c$var$state.screenAngle - screen.angle;
  if (Math.abs(rotation) % 180 && !$bb39c0fc1c19b34c$var$state.isOpen) {
    let width = $bb39c0fc1c19b34c$var$state.screenWidth;
    let height = $bb39c0fc1c19b34c$var$state.screenHeight;
    $bb39c0fc1c19b34c$var$state.screenWidth = height;
    $bb39c0fc1c19b34c$var$state.screenHeight = width;
  }
  if (!$bb39c0fc1c19b34c$var$state.isOpen) $bb39c0fc1c19b34c$var$state.screenAngle = screen.angle;
}
function $bb39c0fc1c19b34c$var$onFocus(e) {
  let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
  let willKeyboardOpen = $bb39c0fc1c19b34c$export$c57958e35f31ed73(target);
  let time = performance.now();
  let screen = $bb39c0fc1c19b34c$var$getTouchScreen();
  let delta = $bb39c0fc1c19b34c$var$state.screenHeight - screen.height;
  if (delta < $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT && willKeyboardOpen) {
    $bb39c0fc1c19b34c$var$state.screenWidth = screen.width;
    $bb39c0fc1c19b34c$var$state.screenHeight = screen.height;
    $bb39c0fc1c19b34c$var$state.screenAngle = screen.angle;
    $bb39c0fc1c19b34c$var$state.startTimeStamp = time;
  }
  if (willKeyboardOpen) window.clearTimeout($bb39c0fc1c19b34c$var$state.screenTimeout);
  if (delta >= $bb39c0fc1c19b34c$var$KEYBOARD_HEIGHT && willKeyboardOpen) $bb39c0fc1c19b34c$var$state.endTimeStamp = time;
}
function $bb39c0fc1c19b34c$var$setupGlobalEvents() {
  let screen = $bb39c0fc1c19b34c$var$getTouchScreen();
  (0, $d447af545b77c9f1$export$f531f92e2a15358f)(window.visualViewport, "resize", (0, $2add3ce32c6007eb$export$78551043582a6a98)() ? $bb39c0fc1c19b34c$var$onResizeEnd : $bb39c0fc1c19b34c$var$onResizeStart);
  (0, $d447af545b77c9f1$export$f531f92e2a15358f)(window.screen.orientation, "change", $bb39c0fc1c19b34c$var$onOrientationChange);
  (0, $d447af545b77c9f1$export$f531f92e2a15358f)(window, "focus", $bb39c0fc1c19b34c$var$onFocus, {
    capture: true,
    passive: true
  });
  $bb39c0fc1c19b34c$var$state.screenWidth = screen.width;
  $bb39c0fc1c19b34c$var$state.screenHeight = screen.height;
  $bb39c0fc1c19b34c$var$state.screenAngle = screen.angle;
}
if (typeof document !== "undefined") {
  if (document.readyState !== "loading") $bb39c0fc1c19b34c$var$setupGlobalEvents();
  else (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "DOMContentLoaded", $bb39c0fc1c19b34c$var$setupGlobalEvents);
}
function $bb39c0fc1c19b34c$export$a986ed8aea890397() {
  let viewportMeta = (0, $7096878c21af5e66$export$a929f3f93e2cc67e)("viewport");
  if ((0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && viewportMeta?.includes("overlays-content")) return false;
  if ($bb39c0fc1c19b34c$var$state.isOpen) return true;
  if (!$bb39c0fc1c19b34c$var$state.startTimeStamp) return window.navigator.maxTouchPoints > 0;
  if ($bb39c0fc1c19b34c$var$state.endTimeStamp >= $bb39c0fc1c19b34c$var$state.startTimeStamp) return true;
  return performance.now() - $bb39c0fc1c19b34c$var$state.startTimeStamp <= $bb39c0fc1c19b34c$var$KEYBOARD_TIMEOUT ? $bb39c0fc1c19b34c$var$state.endTimeStamp > 0 || window.navigator.maxTouchPoints > 0 : false;
}
function $bb39c0fc1c19b34c$export$c57958e35f31ed73(target) {
  if (!(target instanceof Element) || !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(target)) return false;
  let isTextArea = target instanceof HTMLTextAreaElement;
  let isEditable = target instanceof HTMLElement && target.isContentEditable;
  let isTextInput = target instanceof HTMLInputElement && !$bb39c0fc1c19b34c$var$nonTextInputTypes.has(target.type);
  return isTextArea || isEditable || isTextInput;
}
function $bb39c0fc1c19b34c$export$16792effe837dba3(event) {
  return (0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? event.metaKey : event.ctrlKey;
}
function $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7() {
  return $bb39c0fc1c19b34c$var$state.isOpen;
}

// node_modules/react-aria/dist/private/utils/useEffectEvent.mjs
var import_react10 = __toESM(require("react"), 1);
var $fe16bffc7a557bf0$var$useEarlyEffect = (0, import_react10.default)["useInsertionEffect"] ?? (0, $c4867b2f328c2698$export$e5c5a5f917a5871c);
function $fe16bffc7a557bf0$export$7f54fc3180508a52(fn) {
  const ref = (0, import_react10.useRef)(null);
  $fe16bffc7a557bf0$var$useEarlyEffect(() => {
    ref.current = fn;
  }, [
    fn
  ]);
  return (0, import_react10.useCallback)((...args) => {
    const f = ref.current;
    return f?.(...args);
  }, []);
}

// node_modules/react-aria/dist/private/utils/useEvent.mjs
var import_react11 = require("react");
function $600b3cf69ae46262$export$90fc3a17d93f704c(ref, event, listener, options) {
  let handleEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(listener);
  let isDisabled = listener == null;
  (0, import_react11.useEffect)(() => {
    if (isDisabled || ref.current == null) return;
    return (0, $d447af545b77c9f1$export$f531f92e2a15358f)(ref.current, event, handleEvent, options);
  }, [
    ref,
    event,
    options,
    isDisabled
  ]);
}

// node_modules/react-aria/dist/private/utils/useLabels.mjs
function $e8ac3c3f5d4bae7f$export$d6875122194c7b44(props, defaultLabel) {
  let { id, "aria-label": label, "aria-labelledby": labelledBy } = props;
  id = (0, $390e54f620492c70$export$f680877a34711e37)(id);
  if (labelledBy && label) {
    let ids = /* @__PURE__ */ new Set([
      id,
      ...labelledBy.trim().split(/\s+/)
    ]);
    labelledBy = [
      ...ids
    ].join(" ");
  } else if (labelledBy) labelledBy = labelledBy.trim().split(/\s+/).join(" ");
  if (!label && !labelledBy && defaultLabel) label = defaultLabel;
  return {
    id,
    "aria-label": label,
    "aria-labelledby": labelledBy
  };
}

// node_modules/react-aria/dist/private/i18n/utils.mjs
var $d805ff57cab8bee2$var$RTL_SCRIPTS = /* @__PURE__ */ new Set([
  "Arab",
  "Syrc",
  "Samr",
  "Mand",
  "Thaa",
  "Mend",
  "Nkoo",
  "Adlm",
  "Rohg",
  "Hebr"
]);
var $d805ff57cab8bee2$var$RTL_LANGS = /* @__PURE__ */ new Set([
  "ae",
  "ar",
  "arc",
  "bcc",
  "bqi",
  "ckb",
  "dv",
  "fa",
  "glk",
  "he",
  "ku",
  "mzn",
  "nqo",
  "pnb",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi"
]);
function $d805ff57cab8bee2$export$702d680b21cbd764(localeString) {
  if (Intl.Locale) {
    let locale = new Intl.Locale(localeString).maximize();
    let textInfo = (
      // @ts-ignore - this was implemented as a property by some browsers before it was standardized as a function.
      typeof locale.getTextInfo === "function" ? locale.getTextInfo() : locale.textInfo
    );
    if (textInfo) return textInfo.direction === "rtl";
    if (locale.script) return $d805ff57cab8bee2$var$RTL_SCRIPTS.has(locale.script);
  }
  let lang = localeString.split("-")[0];
  return $d805ff57cab8bee2$var$RTL_LANGS.has(lang);
}

// node_modules/react-aria/dist/private/i18n/useDefaultLocale.mjs
var import_react12 = require("react");
var $520a025cdb0d710d$var$localeSymbol = Symbol.for("react-aria.i18n.locale");
function $520a025cdb0d710d$export$f09106e7c6677ec5() {
  let locale = typeof window !== "undefined" && window[$520a025cdb0d710d$var$localeSymbol] || // @ts-ignore
  typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage) || "en-US";
  try {
    Intl.DateTimeFormat.supportedLocalesOf([
      locale
    ]);
  } catch {
    locale = "en-US";
  }
  return {
    locale,
    direction: (0, $d805ff57cab8bee2$export$702d680b21cbd764)(locale) ? "rtl" : "ltr"
  };
}
var $520a025cdb0d710d$var$currentLocale = $520a025cdb0d710d$export$f09106e7c6677ec5();
var $520a025cdb0d710d$var$listeners = /* @__PURE__ */ new Set();
function $520a025cdb0d710d$var$updateLocale() {
  $520a025cdb0d710d$var$currentLocale = $520a025cdb0d710d$export$f09106e7c6677ec5();
  for (let listener of $520a025cdb0d710d$var$listeners) listener($520a025cdb0d710d$var$currentLocale);
}
function $520a025cdb0d710d$export$188ec29ebc2bdc3a() {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let [defaultLocale, setDefaultLocale] = (0, import_react12.useState)($520a025cdb0d710d$var$currentLocale);
  (0, import_react12.useEffect)(() => {
    if ($520a025cdb0d710d$var$listeners.size === 0) window.addEventListener("languagechange", $520a025cdb0d710d$var$updateLocale);
    $520a025cdb0d710d$var$listeners.add(setDefaultLocale);
    return () => {
      $520a025cdb0d710d$var$listeners.delete(setDefaultLocale);
      if ($520a025cdb0d710d$var$listeners.size === 0) window.removeEventListener("languagechange", $520a025cdb0d710d$var$updateLocale);
    };
  }, []);
  if (isSSR) {
    let locale = typeof window !== "undefined" && window[$520a025cdb0d710d$var$localeSymbol];
    return {
      locale: locale || "en-US",
      direction: "ltr"
    };
  }
  return defaultLocale;
}

// node_modules/react-aria/dist/private/i18n/I18nProvider.mjs
var import_react13 = __toESM(require("react"), 1);
var $2eb8e6d23f3d0cb0$var$I18nContext = /* @__PURE__ */ (0, import_react13.default).createContext(null);
function $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7() {
  let defaultLocale = (0, $520a025cdb0d710d$export$188ec29ebc2bdc3a)();
  let context = (0, import_react13.useContext)($2eb8e6d23f3d0cb0$var$I18nContext);
  return context || defaultLocale;
}

// node_modules/@internationalized/string/dist/private/LocalizedStringDictionary.mjs
var $a747a10fe70a57da$var$localeSymbol = Symbol.for("react-aria.i18n.locale");
var $a747a10fe70a57da$var$stringsSymbol = Symbol.for("react-aria.i18n.strings");
var $a747a10fe70a57da$var$cachedGlobalStrings = void 0;
var $a747a10fe70a57da$export$c17fa47878dc55b6 = class _$a747a10fe70a57da$export$c17fa47878dc55b6 {
  constructor(messages, defaultLocale = "en-US") {
    this.strings = Object.fromEntries(Object.entries(messages).filter(([, v]) => v));
    this.defaultLocale = defaultLocale;
  }
  /** Returns a localized string for the given key and locale. */
  getStringForLocale(key, locale) {
    let strings = this.getStringsForLocale(locale);
    let string = strings[key];
    if (!string) throw new Error(`Could not find intl message ${key} in ${locale} locale`);
    return string;
  }
  /** Returns all localized strings for the given locale. */
  getStringsForLocale(locale) {
    let strings = this.strings[locale];
    if (!strings) {
      strings = $a747a10fe70a57da$var$getStringsForLocale(locale, this.strings, this.defaultLocale);
      this.strings[locale] = strings;
    }
    return strings;
  }
  static getGlobalDictionaryForPackage(packageName) {
    if (typeof window === "undefined") return null;
    let locale = window[$a747a10fe70a57da$var$localeSymbol];
    if ($a747a10fe70a57da$var$cachedGlobalStrings === void 0) {
      let globalStrings = window[$a747a10fe70a57da$var$stringsSymbol];
      if (!globalStrings) return null;
      $a747a10fe70a57da$var$cachedGlobalStrings = {};
      for (let pkg in globalStrings) $a747a10fe70a57da$var$cachedGlobalStrings[pkg] = new _$a747a10fe70a57da$export$c17fa47878dc55b6({
        [locale]: globalStrings[pkg]
      }, locale);
    }
    let dictionary = $a747a10fe70a57da$var$cachedGlobalStrings?.[packageName];
    if (!dictionary) throw new Error(`Strings for package "${packageName}" were not included by LocalizedStringProvider. Please add it to the list passed to createLocalizedStringDictionary.`);
    return dictionary;
  }
};
function $a747a10fe70a57da$var$getStringsForLocale(locale, strings, defaultLocale = "en-US") {
  if (strings[locale]) return strings[locale];
  let language = $a747a10fe70a57da$var$getLanguage(locale);
  let script = $a747a10fe70a57da$var$getScript(locale);
  if (script && strings[`${language}-${script}`]) return strings[`${language}-${script}`];
  if (strings[language]) return strings[language];
  for (let key in strings) {
    if (key.startsWith(language + "-")) return strings[key];
  }
  return strings[defaultLocale];
}
function $a747a10fe70a57da$var$getLanguage(locale) {
  if (Intl.Locale)
    return new Intl.Locale(locale).language;
  return locale.split("-")[0];
}
function $a747a10fe70a57da$var$getScript(locale) {
  if (Intl.Locale)
    return new Intl.Locale(locale).script;
  return void 0;
}

// node_modules/@internationalized/string/dist/private/LocalizedStringFormatter.mjs
var $b27c684a33948c64$var$pluralRulesCache = /* @__PURE__ */ new Map();
var $b27c684a33948c64$var$numberFormatCache = /* @__PURE__ */ new Map();
var $b27c684a33948c64$export$2f817fcdc4b89ae0 = class {
  constructor(locale, strings) {
    this.locale = locale;
    this.strings = strings;
  }
  /** Formats a localized string for the given key with the provided variables. */
  format(key, variables) {
    let message = this.strings.getStringForLocale(key, this.locale);
    return typeof message === "function" ? message(variables, this) : message;
  }
  plural(count, options, type = "cardinal") {
    let opt = options["=" + count];
    if (opt) return typeof opt === "function" ? opt() : opt;
    let key = this.locale + ":" + type;
    let pluralRules = $b27c684a33948c64$var$pluralRulesCache.get(key);
    if (!pluralRules) {
      pluralRules = new Intl.PluralRules(this.locale, {
        type
      });
      $b27c684a33948c64$var$pluralRulesCache.set(key, pluralRules);
    }
    let selected = pluralRules.select(count);
    opt = options[selected] || options.other;
    return typeof opt === "function" ? opt() : opt;
  }
  number(value) {
    let numberFormat = $b27c684a33948c64$var$numberFormatCache.get(this.locale);
    if (!numberFormat) {
      numberFormat = new Intl.NumberFormat(this.locale);
      $b27c684a33948c64$var$numberFormatCache.set(this.locale, numberFormat);
    }
    return numberFormat.format(value);
  }
  select(options, value) {
    let opt = options[value] || options.other;
    return typeof opt === "function" ? opt() : opt;
  }
};

// node_modules/react-aria/dist/private/i18n/useLocalizedStringFormatter.mjs
var import_react14 = require("react");
var $cf2482eff2eeeec2$var$cache = /* @__PURE__ */ new WeakMap();
function $cf2482eff2eeeec2$var$getCachedDictionary(strings) {
  let dictionary = $cf2482eff2eeeec2$var$cache.get(strings);
  if (!dictionary) {
    dictionary = new (0, $a747a10fe70a57da$export$c17fa47878dc55b6)(strings);
    $cf2482eff2eeeec2$var$cache.set(strings, dictionary);
  }
  return dictionary;
}
function $cf2482eff2eeeec2$export$87b761675e8eaa10(strings, packageName) {
  return packageName && (0, $a747a10fe70a57da$export$c17fa47878dc55b6).getGlobalDictionaryForPackage(packageName) || $cf2482eff2eeeec2$var$getCachedDictionary(strings);
}
function $cf2482eff2eeeec2$export$f12b703ca79dfbb1(strings, packageName) {
  let { locale } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let dictionary = $cf2482eff2eeeec2$export$87b761675e8eaa10(strings, packageName);
  return (0, import_react14.useMemo)(() => new (0, $b27c684a33948c64$export$2f817fcdc4b89ae0)(locale, dictionary), [
    locale,
    dictionary
  ]);
}

// node_modules/react-stately/dist/private/utils/useControlledState.mjs
var import_react15 = __toESM(require("react"), 1);
var $3e6197669829fe11$var$useEarlyEffect = typeof document !== "undefined" || parseInt((0, import_react15.default).version, 10) >= 19 ? (0, import_react15.default)["useInsertionEffect"] ?? (0, import_react15.default).useLayoutEffect : () => {
};
function $3e6197669829fe11$export$40bfa8c7b0832715(value, defaultValue, onChange) {
  let [stateValue, setStateValue] = (0, import_react15.useState)(value || defaultValue);
  let valueRef = (0, import_react15.useRef)(stateValue);
  let isControlledRef = (0, import_react15.useRef)(value !== void 0);
  let isControlled = value !== void 0;
  (0, import_react15.useEffect)(() => {
    let wasControlled = isControlledRef.current;
    if (wasControlled !== isControlled && false) console.warn(`WARN: A component changed from ${wasControlled ? "controlled" : "uncontrolled"} to ${isControlled ? "controlled" : "uncontrolled"}.`);
    isControlledRef.current = isControlled;
  }, [
    isControlled
  ]);
  let currentValue = isControlled ? value : stateValue;
  $3e6197669829fe11$var$useEarlyEffect(() => {
    valueRef.current = currentValue;
  });
  let [, forceUpdate] = (0, import_react15.useReducer)(() => ({}), {});
  let setValue = (0, import_react15.useCallback)((value2, ...args) => {
    let newValue = typeof value2 === "function" ? value2(valueRef.current) : value2;
    if (!Object.is(valueRef.current, newValue)) {
      valueRef.current = newValue;
      setStateValue(newValue);
      forceUpdate();
      onChange?.(newValue, ...args);
    }
  }, [
    onChange
  ]);
  return [
    currentValue,
    setValue
  ];
}

// node_modules/react-aria/dist/private/collections/BaseCollection.mjs
var $6f0c29017aeec335$export$d68d59712b04d9d1 = class {
  constructor(key) {
    this.value = null;
    this.level = 0;
    this.hasChildNodes = false;
    this.rendered = null;
    this.textValue = "";
    this["aria-label"] = void 0;
    this.index = 0;
    this.parentKey = null;
    this.prevKey = null;
    this.nextKey = null;
    this.firstChildKey = null;
    this.lastChildKey = null;
    this.props = {};
    this.colSpan = null;
    this.colIndex = null;
    this.type = this.constructor.type;
    this.key = key;
  }
  get childNodes() {
    throw new Error("childNodes is not supported");
  }
  clone() {
    let node = new this.constructor(this.key);
    node.value = this.value;
    node.level = this.level;
    node.hasChildNodes = this.hasChildNodes;
    node.rendered = this.rendered;
    node.textValue = this.textValue;
    node["aria-label"] = this["aria-label"];
    node.index = this.index;
    node.parentKey = this.parentKey;
    node.prevKey = this.prevKey;
    node.nextKey = this.nextKey;
    node.firstChildKey = this.firstChildKey;
    node.lastChildKey = this.lastChildKey;
    node.props = this.props;
    node.render = this.render;
    node.colSpan = this.colSpan;
    node.colIndex = this.colIndex;
    return node;
  }
  filter(collection, newCollection, filterFn) {
    let clone = this.clone();
    newCollection.addDescendants(clone, collection);
    return clone;
  }
};
var $6f0c29017aeec335$export$b1918e978f1ee46f = class extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
  filter(collection, newCollection, filterFn) {
    let [firstKey, lastKey] = $6f0c29017aeec335$var$filterChildren(collection, newCollection, this.firstChildKey, filterFn);
    let newNode = this.clone();
    newNode.firstChildKey = firstKey;
    newNode.lastChildKey = lastKey;
    return newNode;
  }
};
var _$6f0c29017aeec335$export$5ae2504e948afce5 = class _$6f0c29017aeec335$export$5ae2504e948afce5 extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
};
_$6f0c29017aeec335$export$5ae2504e948afce5.type = "header";
var $6f0c29017aeec335$export$5ae2504e948afce5 = _$6f0c29017aeec335$export$5ae2504e948afce5;
var _$6f0c29017aeec335$export$8258a0665a675899 = class _$6f0c29017aeec335$export$8258a0665a675899 extends $6f0c29017aeec335$export$d68d59712b04d9d1 {
};
_$6f0c29017aeec335$export$8258a0665a675899.type = "loader";
var $6f0c29017aeec335$export$8258a0665a675899 = _$6f0c29017aeec335$export$8258a0665a675899;
var _$6f0c29017aeec335$export$fd11f34e1d07f134 = class _$6f0c29017aeec335$export$fd11f34e1d07f134 extends $6f0c29017aeec335$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    if (filterFn(this.textValue, this)) {
      let clone = this.clone();
      newCollection.addDescendants(clone, collection);
      return clone;
    }
    return null;
  }
};
_$6f0c29017aeec335$export$fd11f34e1d07f134.type = "item";
var $6f0c29017aeec335$export$fd11f34e1d07f134 = _$6f0c29017aeec335$export$fd11f34e1d07f134;
var _$6f0c29017aeec335$export$437f11dc9b403b78 = class _$6f0c29017aeec335$export$437f11dc9b403b78 extends $6f0c29017aeec335$export$b1918e978f1ee46f {
  filter(collection, newCollection, filterFn) {
    let filteredSection = super.filter(collection, newCollection, filterFn);
    if (filteredSection) {
      if (filteredSection.lastChildKey !== null) {
        let lastChild = collection.getItem(filteredSection.lastChildKey);
        if (lastChild && lastChild.type !== "header") return filteredSection;
      }
    }
    return null;
  }
};
_$6f0c29017aeec335$export$437f11dc9b403b78.type = "section";
var $6f0c29017aeec335$export$437f11dc9b403b78 = _$6f0c29017aeec335$export$437f11dc9b403b78;
var $6f0c29017aeec335$export$408d25a4e12db025 = class {
  get size() {
    return this.itemCount;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  *[Symbol.iterator]() {
    let node = this.firstKey != null ? this.keyMap.get(this.firstKey) : void 0;
    while (node) {
      yield node;
      node = node.nextKey != null ? this.keyMap.get(node.nextKey) : void 0;
    }
  }
  getChildren(key) {
    let keyMap = this.keyMap;
    return {
      *[Symbol.iterator]() {
        let parent = keyMap.get(key);
        let node = parent?.firstChildKey != null ? keyMap.get(parent.firstChildKey) : null;
        while (node) {
          yield node;
          node = node.nextKey != null ? keyMap.get(node.nextKey) : void 0;
        }
      }
    };
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.prevKey != null) {
      node = this.keyMap.get(node.prevKey);
      while (node && node.type !== "item" && node.lastChildKey != null) node = this.keyMap.get(node.lastChildKey);
      return node?.key ?? null;
    }
    return node.parentKey;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    if (!node) return null;
    if (node.type !== "item" && node.firstChildKey != null) return node.firstChildKey;
    while (node) {
      if (node.nextKey != null) return node.nextKey;
      if (node.parentKey != null) node = this.keyMap.get(node.parentKey);
      else return null;
    }
    return null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    let node = this.lastKey != null ? this.keyMap.get(this.lastKey) : null;
    while (node?.lastChildKey != null) node = this.keyMap.get(node.lastChildKey);
    return node?.key ?? null;
  }
  getItem(key) {
    return this.keyMap.get(key) ?? null;
  }
  at() {
    throw new Error("Not implemented");
  }
  clone() {
    let Constructor = this.constructor;
    let collection = new Constructor();
    collection.keyMap = new Map(this.keyMap);
    collection.firstKey = this.firstKey;
    collection.lastKey = this.lastKey;
    collection.itemCount = this.itemCount;
    return collection;
  }
  addNode(node) {
    if (this.frozen) throw new Error("Cannot add a node to a frozen collection");
    if (node.type === "item" && this.keyMap.get(node.key) == null) this.itemCount++;
    this.keyMap.set(node.key, node);
  }
  // Deeply add a node and its children to the collection from another collection, primarily used when filtering a collection
  addDescendants(node, oldCollection) {
    this.addNode(node);
    let children = oldCollection.getChildren(node.key);
    for (let child of children) this.addDescendants(child, oldCollection);
  }
  removeNode(key) {
    if (this.frozen) throw new Error("Cannot remove a node to a frozen collection");
    let node = this.keyMap.get(key);
    if (node != null && node.type === "item") this.itemCount--;
    this.keyMap.delete(key);
  }
  commit(firstKey, lastKey, isSSR = false) {
    if (this.frozen) throw new Error("Cannot commit a frozen collection");
    this.firstKey = firstKey;
    this.lastKey = lastKey;
    this.frozen = !isSSR;
  }
  filter(filterFn) {
    let newCollection = new this.constructor();
    let [firstKey, lastKey] = $6f0c29017aeec335$var$filterChildren(this, newCollection, this.firstKey, filterFn);
    newCollection?.commit(firstKey, lastKey);
    return newCollection;
  }
  constructor() {
    this.keyMap = /* @__PURE__ */ new Map();
    this.firstKey = null;
    this.lastKey = null;
    this.frozen = false;
    this.itemCount = 0;
  }
};
function $6f0c29017aeec335$var$filterChildren(collection, newCollection, firstChildKey, filterFn) {
  if (firstChildKey == null) return [
    null,
    null
  ];
  let firstNode = null;
  let lastNode = null;
  let currentNode = collection.getItem(firstChildKey);
  while (currentNode != null) {
    let newNode = currentNode.filter(collection, newCollection, filterFn);
    if (newNode != null) {
      newNode.nextKey = null;
      if (lastNode) {
        newNode.prevKey = lastNode.key;
        lastNode.nextKey = newNode.key;
      }
      if (firstNode == null) firstNode = newNode;
      newCollection.addNode(newNode);
      lastNode = newNode;
    }
    currentNode = currentNode.nextKey != null ? collection.getItem(currentNode.nextKey) : null;
  }
  if (lastNode && lastNode.type === "separator") {
    let prevKey = lastNode.prevKey;
    newCollection.removeNode(lastNode.key);
    if (prevKey != null) {
      lastNode = newCollection.getItem(prevKey);
      lastNode.nextKey = null;
    } else lastNode = null;
  }
  return [
    firstNode?.key ?? null,
    lastNode?.key ?? null
  ];
}

// node_modules/react-aria/dist/private/collections/Document.mjs
var $96ead35620b8fd36$export$410b0c854570d131 = class {
  constructor(ownerDocument) {
    this._firstChild = null;
    this._lastChild = null;
    this._previousSibling = null;
    this._nextSibling = null;
    this._parentNode = null;
    this._minInvalidChildIndex = null;
    this.ownerDocument = ownerDocument;
  }
  *[Symbol.iterator]() {
    let node = this.firstChild;
    while (node) {
      yield node;
      node = node.nextSibling;
    }
  }
  get firstChild() {
    return this._firstChild;
  }
  set firstChild(firstChild) {
    this._firstChild = firstChild;
    this.ownerDocument.markDirty(this);
  }
  get lastChild() {
    return this._lastChild;
  }
  set lastChild(lastChild) {
    this._lastChild = lastChild;
    this.ownerDocument.markDirty(this);
  }
  get previousSibling() {
    return this._previousSibling;
  }
  set previousSibling(previousSibling) {
    this._previousSibling = previousSibling;
    this.ownerDocument.markDirty(this);
  }
  get nextSibling() {
    return this._nextSibling;
  }
  set nextSibling(nextSibling) {
    this._nextSibling = nextSibling;
    this.ownerDocument.markDirty(this);
  }
  get parentNode() {
    return this._parentNode;
  }
  set parentNode(parentNode) {
    this._parentNode = parentNode;
    this.ownerDocument.markDirty(this);
  }
  get isConnected() {
    return this.parentNode?.isConnected || false;
  }
  invalidateChildIndices(child) {
    if (this._minInvalidChildIndex == null || !this._minInvalidChildIndex.isConnected || child.index < this._minInvalidChildIndex.index) {
      this._minInvalidChildIndex = child;
      this.ownerDocument.markDirty(this);
    }
  }
  updateChildIndices() {
    let node = this._minInvalidChildIndex;
    while (node) {
      node.index = node.previousSibling ? node.previousSibling.index + 1 : 0;
      node = node.nextSibling;
    }
    this._minInvalidChildIndex = null;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    if (this.firstChild == null) this.firstChild = child;
    if (this.lastChild) {
      this.lastChild.nextSibling = child;
      child.index = this.lastChild.index + 1;
      child.previousSibling = this.lastChild;
    } else {
      child.previousSibling = null;
      child.index = 0;
    }
    child.parentNode = this;
    child.nextSibling = null;
    this.lastChild = child;
    this.ownerDocument.markDirty(this);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  insertBefore(newNode, referenceNode) {
    if (referenceNode == null) return this.appendChild(newNode);
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    newNode.nextSibling = referenceNode;
    newNode.previousSibling = referenceNode.previousSibling;
    newNode.index = referenceNode.index - 1;
    if (this.firstChild === referenceNode) this.firstChild = newNode;
    else if (referenceNode.previousSibling) referenceNode.previousSibling.nextSibling = newNode;
    referenceNode.previousSibling = newNode;
    newNode.parentNode = referenceNode.parentNode;
    this.invalidateChildIndices(newNode);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  removeChild(child) {
    if (child.parentNode !== this) return;
    if (this._minInvalidChildIndex === child) this._minInvalidChildIndex = null;
    if (child.nextSibling) {
      this.invalidateChildIndices(child.nextSibling);
      child.nextSibling.previousSibling = child.previousSibling;
    }
    if (child.previousSibling) child.previousSibling.nextSibling = child.nextSibling;
    if (this.firstChild === child) this.firstChild = child.nextSibling;
    if (this.lastChild === child) this.lastChild = child.previousSibling;
    child.parentNode = null;
    child.nextSibling = null;
    child.previousSibling = null;
    child.index = 0;
    this.ownerDocument.markDirty(child);
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  addEventListener() {
  }
  removeEventListener() {
  }
  get previousVisibleSibling() {
    let node = this.previousSibling;
    while (node && node.isHidden) node = node.previousSibling;
    return node;
  }
  get nextVisibleSibling() {
    let node = this.nextSibling;
    while (node && node.isHidden) node = node.nextSibling;
    return node;
  }
  get firstVisibleChild() {
    let node = this.firstChild;
    while (node && node.isHidden) node = node.nextSibling;
    return node;
  }
  get lastVisibleChild() {
    let node = this.lastChild;
    while (node && node.isHidden) node = node.previousSibling;
    return node;
  }
};
var $96ead35620b8fd36$export$dc064fe9e59310fd = class _$96ead35620b8fd36$export$dc064fe9e59310fd extends $96ead35620b8fd36$export$410b0c854570d131 {
  constructor(type, ownerDocument) {
    super(ownerDocument), this.nodeType = 8, this.isMutated = true, this._index = 0, this.isHidden = false;
    this.node = null;
  }
  get index() {
    return this._index;
  }
  set index(index) {
    this._index = index;
    this.ownerDocument.markDirty(this);
  }
  get level() {
    if (this.parentNode instanceof _$96ead35620b8fd36$export$dc064fe9e59310fd) return this.parentNode.level + (this.parentNode.node?.type === "item" ? 1 : 0);
    return 0;
  }
  /**
  * Lazily gets a mutable instance of a Node. If the node has already
  * been cloned during this update cycle, it just returns the existing one.
  */
  getMutableNode() {
    if (this.node == null) return null;
    if (!this.isMutated) {
      this.node = this.node.clone();
      this.isMutated = true;
    }
    this.ownerDocument.markDirty(this);
    return this.node;
  }
  updateNode() {
    let nextSibling = this.nextVisibleSibling;
    let node = this.getMutableNode();
    if (node == null) return;
    node.index = this.index;
    node.level = this.level;
    node.parentKey = this.parentNode instanceof _$96ead35620b8fd36$export$dc064fe9e59310fd ? this.parentNode.node?.key ?? null : null;
    node.prevKey = this.previousVisibleSibling?.node?.key ?? null;
    node.nextKey = nextSibling?.node?.key ?? null;
    node.hasChildNodes = !!this.firstChild;
    node.firstChildKey = this.firstVisibleChild?.node?.key ?? null;
    node.lastChildKey = this.lastVisibleChild?.node?.key ?? null;
    if ((node.colSpan != null || node.colIndex != null) && nextSibling) {
      let nextColIndex = (node.colIndex ?? node.index) + (node.colSpan ?? 1);
      if (nextSibling.node != null && nextColIndex !== nextSibling.node.colIndex) {
        let siblingNode = nextSibling.getMutableNode();
        siblingNode.colIndex = nextColIndex;
      }
    }
  }
  setProps(obj, ref, CollectionNodeClass, rendered, render) {
    let node;
    let { value: value1, textValue, id, ...props } = obj;
    if (this.node == null) {
      node = new CollectionNodeClass(id ?? `react-aria-${++this.ownerDocument.nodeId}`);
      this.node = node;
    } else node = this.getMutableNode();
    props.ref = ref;
    node.props = props;
    node.rendered = rendered;
    node.render = render;
    node.value = value1;
    if (obj["aria-label"]) node["aria-label"] = obj["aria-label"];
    node.textValue = textValue || (typeof props.children === "string" ? props.children : "") || obj["aria-label"] || "";
    if (id != null && id !== node.key) throw new Error("Cannot change the id of an item");
    if (props.colSpan != null) node.colSpan = props.colSpan;
    if (this.isConnected) this.ownerDocument.queueUpdate();
  }
  get style() {
    let element = this;
    return {
      get display() {
        return element.isHidden ? "none" : "";
      },
      set display(value) {
        let isHidden = value === "none";
        if (element.isHidden !== isHidden) {
          if (element.parentNode?.firstVisibleChild === element || element.parentNode?.lastVisibleChild === element) element.ownerDocument.markDirty(element.parentNode);
          let prev = element.previousVisibleSibling;
          let next = element.nextVisibleSibling;
          if (prev) element.ownerDocument.markDirty(prev);
          if (next) element.ownerDocument.markDirty(next);
          element.isHidden = isHidden;
          element.ownerDocument.markDirty(element);
        }
      }
    };
  }
  hasAttribute() {
  }
  setAttribute() {
  }
  setAttributeNS() {
  }
  removeAttribute() {
  }
};
var $96ead35620b8fd36$export$b34a105447964f9f = class extends $96ead35620b8fd36$export$410b0c854570d131 {
  constructor(collection) {
    super(null), this.nodeType = 11, this.ownerDocument = this, this.dirtyNodes = /* @__PURE__ */ new Set(), this.isSSR = false, this.nodeId = 0, this.nodesByProps = /* @__PURE__ */ new WeakMap(), this.keyOwners = /* @__PURE__ */ new Map(), this.nextCollection = null, this.subscriptions = /* @__PURE__ */ new Set(), this.queuedRender = false, this.inSubscription = false;
    this.collection = collection;
    this.nextCollection = collection;
  }
  get isConnected() {
    return true;
  }
  createElement(type) {
    return new $96ead35620b8fd36$export$dc064fe9e59310fd(type, this);
  }
  getMutableCollection() {
    if (!this.nextCollection) this.nextCollection = this.collection.clone();
    return this.nextCollection;
  }
  markDirty(node) {
    this.dirtyNodes.add(node);
  }
  addNode(element) {
    if (element.isHidden || element.node == null) return;
    if (false) {
      let key = element.node.key;
      let owner = this.keyOwners.get(key);
      if (owner && owner !== element) throw new Error(`Duplicate key "${String(key)}" found in collection. Every item in a collection must have a unique key.`);
      this.keyOwners.set(key, element);
    }
    let collection = this.getMutableCollection();
    if (!collection.getItem(element.node.key)) for (let child of element) this.addNode(child);
    collection.addNode(element.node);
  }
  removeNode(node) {
    for (let child of node) this.removeNode(child);
    if (node.node) {
      let collection = this.getMutableCollection();
      collection.removeNode(node.node.key);
      if (false) this.keyOwners.delete(node.node.key);
    }
  }
  /** Finalizes the collection update, updating all nodes and freezing the collection. */
  getCollection() {
    if (this.inSubscription) return this.collection;
    this.queuedRender = false;
    this.updateCollection();
    return this.collection;
  }
  updateCollection() {
    for (let element of this.dirtyNodes) if (element instanceof $96ead35620b8fd36$export$dc064fe9e59310fd && (!element.isConnected || element.isHidden)) this.removeNode(element);
    else element.updateChildIndices();
    for (let element of this.dirtyNodes) if (element instanceof $96ead35620b8fd36$export$dc064fe9e59310fd) {
      if (element.isConnected && !element.isHidden) {
        element.updateNode();
        this.addNode(element);
      }
      if (element.node) this.dirtyNodes.delete(element);
      element.isMutated = false;
    } else this.dirtyNodes.delete(element);
    if (this.nextCollection) {
      this.nextCollection.commit(this.firstVisibleChild?.node?.key ?? null, this.lastVisibleChild?.node?.key ?? null, this.isSSR);
      if (!this.isSSR) {
        this.collection = this.nextCollection;
        this.nextCollection = null;
      }
    }
  }
  queueUpdate() {
    if (this.dirtyNodes.size === 0 || this.queuedRender) return;
    this.queuedRender = true;
    this.inSubscription = true;
    if (!this.isSSR) this.collection = this.collection.clone();
    for (let fn of this.subscriptions) fn();
    this.inSubscription = false;
  }
  subscribe(fn) {
    this.subscriptions.add(fn);
    if (this.queuedRender) fn();
    return () => this.subscriptions.delete(fn);
  }
  resetAfterSSR() {
    if (this.isSSR) {
      this.isSSR = false;
      this.firstChild = null;
      this.lastChild = null;
      this.nodeId = 0;
      this.keyOwners.clear();
    }
  }
};

// node_modules/react-aria/dist/private/collections/useCachedChildren.mjs
var import_react16 = require("react");
function $a80bd3e9349588e7$export$727c8fc270210f13(props) {
  let { children, items, idScope, addIdAndValue, dependencies = [] } = props;
  let childrenString = (0, import_react16.useMemo)(() => false ? children.toString() : void 0, [
    children
  ]);
  let cache = (0, import_react16.useMemo)(() => /* @__PURE__ */ new WeakMap(), [
    ...dependencies,
    childrenString
  ]);
  return (0, import_react16.useMemo)(() => {
    if (items && typeof children === "function") {
      let res = [];
      for (let item of items) {
        let cacheKey = $a80bd3e9349588e7$var$isWeakKey(item) ? item : null;
        let rendered = cacheKey ? cache.get(cacheKey) : null;
        if (!rendered) {
          rendered = children(item);
          let id = rendered.props.id ?? item?.key ?? item?.id;
          if (idScope != null && rendered.props.id == null && id != null) id = idScope + ":" + id;
          let key = id ?? res.length;
          rendered = (0, import_react16.cloneElement)(rendered, addIdAndValue ? {
            key,
            id,
            value: item
          } : {
            key
          });
          if (cacheKey) cache.set(cacheKey, rendered);
        }
        res.push(rendered);
      }
      return res;
    } else if (typeof children !== "function") return children;
  }, [
    children,
    items,
    cache,
    idScope,
    addIdAndValue
  ]);
}
function $a80bd3e9349588e7$var$isWeakKey(value) {
  switch (typeof value) {
    case "object":
      return value != null;
    case "function":
    case "symbol":
      return true;
    default:
      return false;
  }
}

// node_modules/react-aria/dist/private/utils/runAfterTransition.mjs
var $081cb5757e08788e$var$transitionsByElement = /* @__PURE__ */ new Map();
var $081cb5757e08788e$var$transitionCallbacks = /* @__PURE__ */ new Set();
function $081cb5757e08788e$var$isTransitionEvent(event) {
  return "propertyName" in event;
}
function $081cb5757e08788e$var$onTransitionStart(e) {
  let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
  if (!$081cb5757e08788e$var$isTransitionEvent(e) || !eventTarget) return;
  let transitions = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
  if (!transitions) {
    transitions = /* @__PURE__ */ new Set();
    $081cb5757e08788e$var$transitionsByElement.set(eventTarget, transitions);
    eventTarget.addEventListener("transitioncancel", $081cb5757e08788e$var$onTransitionEnd, {
      once: true
    });
  }
  transitions.add(e.propertyName);
}
function $081cb5757e08788e$var$onTransitionEnd(e) {
  let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
  if (!$081cb5757e08788e$var$isTransitionEvent(e) || !eventTarget) return;
  let properties = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
  if (!properties) return;
  properties.delete(e.propertyName);
  if (properties.size === 0) {
    eventTarget.removeEventListener("transitioncancel", $081cb5757e08788e$var$onTransitionEnd);
    $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
  }
  if ($081cb5757e08788e$var$transitionsByElement.size === 0) for (let callback of $081cb5757e08788e$var$transitionCallbacks) {
    callback(true);
    $081cb5757e08788e$var$transitionCallbacks.delete(callback);
  }
}
function $081cb5757e08788e$var$setupGlobalEvents() {
  (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "transitionrun", $081cb5757e08788e$var$onTransitionStart);
  (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "transitionend", $081cb5757e08788e$var$onTransitionEnd);
}
function $081cb5757e08788e$var$cleanupDetachedElements() {
  for (const [eventTarget] of $081cb5757e08788e$var$transitionsByElement)
    if ("isConnected" in eventTarget && !eventTarget.isConnected) $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
}
if (typeof document !== "undefined") {
  if (document.readyState !== "loading") $081cb5757e08788e$var$setupGlobalEvents();
  else (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "DOMContentLoaded", $081cb5757e08788e$var$setupGlobalEvents);
}
function $081cb5757e08788e$export$24490316f764c430(fn) {
  let frame = window.requestAnimationFrame(() => {
    $081cb5757e08788e$var$cleanupDetachedElements();
    if ($081cb5757e08788e$var$transitionsByElement.size === 0) return fn(false);
    $081cb5757e08788e$var$transitionCallbacks.add(fn);
  });
  return () => {
    window.cancelAnimationFrame(frame);
    $081cb5757e08788e$var$transitionCallbacks.delete(fn);
  };
}

// node_modules/react-aria/dist/private/interactions/focusSafely.mjs
function $f192c2f16961cbe0$export$80f3e147d781571c(element) {
  if (!element.isConnected) return;
  const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
  if ((0, $8f5a2122b0992be3$export$630ff653c5ada6a9)() === "virtual") {
    let lastFocusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
    (0, $081cb5757e08788e$export$24490316f764c430)(() => {
      const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      if ((activeElement === lastFocusedElement || activeElement === ownerDocument.body) && element.isConnected) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
    });
  } else (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
}

// node_modules/react-aria/dist/private/interactions/useFocus.mjs
var import_react17 = require("react");
function $1e74c67db218ce67$export$f8168d8dd8fd66e6(props) {
  let { isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange } = props;
  const onBlur = (0, import_react17.useCallback)((e) => {
    if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === e.currentTarget) {
      if (onBlurProp) onBlurProp(e);
      if (onFocusChange) onFocusChange(false);
      return true;
    }
  }, [
    onBlurProp,
    onFocusChange
  ]);
  const onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
  const onFocus = (0, import_react17.useCallback)((e) => {
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
    const activeElement = ownerDocument ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument) : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
    if (eventTarget === e.currentTarget && eventTarget === activeElement) {
      if (onFocusProp) onFocusProp(e);
      if (onFocusChange) onFocusChange(true);
      onSyntheticFocus(e);
    }
  }, [
    onFocusChange,
    onFocusProp,
    onSyntheticFocus
  ]);
  return {
    focusProps: {
      onFocus: !isDisabled && (onFocusProp || onFocusChange || onBlurProp) ? onFocus : void 0,
      onBlur: !isDisabled && (onBlurProp || onFocusChange) ? onBlur : void 0
    }
  };
}

// node_modules/react-aria/dist/private/interactions/createEventHandler.mjs
function $8dba16319206abb6$export$48d1ea6320830260(handler) {
  if (!handler) return void 0;
  return (e) => {
    let shouldStopPropagation = true;
    let event = {
      ...e,
      preventDefault() {
        e.preventDefault();
      },
      isDefaultPrevented() {
        return e.isDefaultPrevented();
      },
      stopPropagation() {
        if (shouldStopPropagation && false) console.error("stopPropagation is now the default behavior for events in React Spectrum. You can use continuePropagation() to revert this behavior.");
        else shouldStopPropagation = true;
      },
      continuePropagation() {
        shouldStopPropagation = false;
        if (typeof e.continuePropagation === "function") e.continuePropagation();
      },
      isPropagationStopped() {
        return shouldStopPropagation;
      }
    };
    handler(event);
    if (shouldStopPropagation && !(typeof e.isPropagationStopped === "function" && e.isPropagationStopped())) e.stopPropagation();
  };
}

// node_modules/react-aria/dist/private/interactions/createKeyboardShortcutHandler.mjs
var $cbf729ad7eb217b0$var$MODIFIER_NAMES = /* @__PURE__ */ new Set([
  "shift",
  "alt",
  "control",
  "meta",
  "mod"
  // OS dependent - Cmd on Mac, Control on Windows/Linux
]);
var $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER = [
  "Alt",
  "Control",
  "Meta",
  "Shift"
];
function $cbf729ad7eb217b0$export$9932402e211e7315(parsed) {
  let set = /* @__PURE__ */ new Set();
  if (parsed.alt) set.add("Alt");
  if (parsed.shift) set.add("Shift");
  if (parsed.ctrl) set.add("Control");
  if (parsed.meta) set.add("Meta");
  if (parsed.mod) set.add((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? "Meta" : "Control");
  return set;
}
function $cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e) {
  let set = /* @__PURE__ */ new Set();
  if (e.altKey) set.add("Alt");
  if (e.ctrlKey) set.add("Control");
  if (e.metaKey) set.add("Meta");
  if (e.shiftKey) set.add("Shift");
  return set;
}
function $cbf729ad7eb217b0$var$sortedModifierTokens(set) {
  return $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER.filter((name2) => set.has(name2));
}
function $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec) {
  let parts = spec.split("+").reduce((prev, part) => {
    let lower = part.toLowerCase();
    if ($cbf729ad7eb217b0$var$MODIFIER_NAMES.has(lower)) {
      if (lower === "shift") prev.shift = true;
      else if (lower === "alt") prev.alt = true;
      else if (lower === "control") prev.ctrl = true;
      else if (lower === "meta") prev.meta = true;
      else if (lower === "mod") prev.mod = true;
    } else prev.key = part;
    return prev;
  }, {
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
    mod: false,
    key: ""
  });
  if (parts.key === "") throw new Error(`Invalid keyboard shortcut: "${spec}". Must include exactly one non-modifier key (e.g. "a", "Enter", "ArrowDown"). Combine any of Shift, Alt, Ctrl, Meta, and Mod.`);
  return parts;
}
function $cbf729ad7eb217b0$var$normalizeEventKey(key) {
  return key.toLowerCase();
}
var $cbf729ad7eb217b0$var$KEY_ALIASES = {
  space: " ",
  esc: "escape",
  del: "delete",
  ins: "insert",
  left: "arrowleft",
  right: "arrowright",
  up: "arrowup",
  down: "arrowdown",
  pageup: "pageup",
  pagedown: "pagedown"
};
function $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(specKey) {
  let k = $cbf729ad7eb217b0$var$normalizeEventKey(specKey);
  let aliased = $cbf729ad7eb217b0$var$KEY_ALIASES[k];
  return aliased != null ? aliased : k;
}
function $cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed) {
  let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$9932402e211e7315(parsed));
  let key = $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(parsed.key);
  return mods.length > 0 ? `${mods.join("+")}+${key}` : key;
}
function $cbf729ad7eb217b0$export$786304bda41dd69f(e) {
  let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e));
  let key = $cbf729ad7eb217b0$var$normalizeEventKey(e.key);
  let prefix = mods.length > 0 ? `${mods.join("+")}+` : "";
  return prefix + key;
}
function $cbf729ad7eb217b0$export$2fd1fc8039383ae1(bindings) {
  let map = /* @__PURE__ */ new Map();
  for (let [spec, action] of Object.entries(bindings)) {
    let parsed = $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec);
    map.set($cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed), action);
  }
  return (e) => {
    let canonical = $cbf729ad7eb217b0$export$786304bda41dd69f(e);
    let action = map.get(canonical);
    let result = action?.(e);
    if (result === void 0 && action !== void 0) result = {
      shouldContinuePropagation: false,
      shouldPreventDefault: true
    };
    else if (typeof result === "boolean") result = {
      shouldContinuePropagation: !result,
      shouldPreventDefault: result
    };
    if (result?.shouldPreventDefault) e.preventDefault();
    if (!action || result?.shouldContinuePropagation) e.continuePropagation();
  };
}

// node_modules/react-aria/dist/private/interactions/useKeyboard.mjs
function $8296dad1a4c5e0dc$export$8f71654801c2f7cd(props) {
  let { shortcuts, allowRepeats = false, allowComposing = false } = props;
  let onKeyDown;
  let onKeyUp;
  if (shortcuts) {
    let shortcutHandler = (0, $cbf729ad7eb217b0$export$2fd1fc8039383ae1)(shortcuts);
    let shortcutOnKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)((e) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
        e.continuePropagation();
        return;
      }
      if (e.nativeEvent?.repeat && !allowRepeats || e.nativeEvent?.isComposing && !allowComposing) {
        e.continuePropagation();
        return;
      }
      shortcutHandler(e);
    });
    let shortcutOnKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)((e) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
        e.continuePropagation();
        return;
      }
      if (e.nativeEvent?.repeat && !allowRepeats || e.nativeEvent?.isComposing && !allowComposing) {
        e.continuePropagation();
        return;
      }
      e.continuePropagation();
    });
    onKeyDown = props.onKeyDown ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyDown, shortcutOnKeyDown) : shortcutOnKeyDown;
    onKeyUp = props.onKeyUp ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyUp, shortcutOnKeyUp) : shortcutOnKeyUp;
  } else {
    onKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyDown);
    onKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyUp);
  }
  return {
    keyboardProps: props.isDisabled ? {} : {
      onKeyDown,
      onKeyUp
    }
  };
}

// node_modules/react-aria/dist/private/utils/useSyncRef.mjs
function $b7115c395c64f7b5$export$4debdb1a3f0fa79e(context, ref) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (context && context.ref && ref) {
      context.ref.current = ref.current;
      return () => {
        if (context.ref)
          context.ref.current = null;
      };
    }
  });
}

// node_modules/react-aria/dist/private/interactions/useFocusable.mjs
var import_react18 = __toESM(require("react"), 1);
var $d1116acdf220c2da$export$f9762fab77588ecb = /* @__PURE__ */ (0, import_react18.default).createContext(null);
function $d1116acdf220c2da$var$useFocusableContext(ref) {
  let context = (0, import_react18.useContext)($d1116acdf220c2da$export$f9762fab77588ecb) || {};
  (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, ref);
  let { ref: _, ...otherProps } = context;
  return otherProps;
}
function $d1116acdf220c2da$export$4c014de7c8940b4c(props, domRef) {
  let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)(props);
  let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)(props);
  let interactions = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(focusProps, keyboardProps);
  let domProps = $d1116acdf220c2da$var$useFocusableContext(domRef);
  let interactionProps = props.isDisabled ? {} : domProps;
  let autoFocusRef = (0, import_react18.useRef)(props.autoFocus);
  (0, import_react18.useEffect)(() => {
    if (autoFocusRef.current && domRef.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(domRef.current);
    autoFocusRef.current = false;
  }, [
    domRef
  ]);
  let tabIndex = props.excludeFromTabOrder ? -1 : 0;
  if (props.isDisabled) tabIndex = void 0;
  return {
    focusableProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)({
      ...interactions,
      tabIndex
    }, interactionProps)
  };
}

// node_modules/react-aria/dist/private/collections/Hidden.mjs
var import_react19 = __toESM(require("react"), 1);
if (typeof HTMLTemplateElement !== "undefined") {
  Object.defineProperty(HTMLTemplateElement.prototype, "firstChild", {
    configurable: true,
    enumerable: true,
    get: function() {
      return this.content.firstChild;
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "appendChild", {
    configurable: true,
    enumerable: true,
    value: function(node) {
      return this.content.appendChild(node);
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "removeChild", {
    configurable: true,
    enumerable: true,
    value: function(node) {
      return this.content.removeChild(node);
    }
  });
  Object.defineProperty(HTMLTemplateElement.prototype, "insertBefore", {
    configurable: true,
    enumerable: true,
    value: function(node, child) {
      return this.content.insertBefore(node, child);
    }
  });
}
var $d7f64c32b702fe2c$export$94b6d0abf7d33e8c = /* @__PURE__ */ (0, import_react19.createContext)(false);
function $d7f64c32b702fe2c$export$8dc98ba7eadeaa56(props) {
  let isHidden = (0, import_react19.useContext)($d7f64c32b702fe2c$export$94b6d0abf7d33e8c);
  if (isHidden)
    return /* @__PURE__ */ (0, import_react19.default).createElement((0, import_react19.default).Fragment, null, props.children);
  let children = /* @__PURE__ */ (0, import_react19.default).createElement($d7f64c32b702fe2c$export$94b6d0abf7d33e8c.Provider, {
    value: true
  }, props.children);
  return /* @__PURE__ */ (0, import_react19.default).createElement("template", null, children);
}

// node_modules/react-aria/dist/private/collections/CollectionBuilder.mjs
var import_react_dom = require("react-dom");
var import_react20 = __toESM(require("react"), 1);
var import_shim = __toESM(require_shim(), 1);
var $42ceafc619f9c3ba$var$ShallowRenderContext = /* @__PURE__ */ (0, import_react20.createContext)(false);
var $42ceafc619f9c3ba$var$CollectionDocumentContext = /* @__PURE__ */ (0, import_react20.createContext)(null);
function $42ceafc619f9c3ba$export$bf788dd355e3a401(props) {
  let doc = (0, import_react20.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  if (doc)
    return props.content;
  let { collection, document: document2 } = $42ceafc619f9c3ba$var$useCollectionDocument(props.createCollection);
  return /* @__PURE__ */ (0, import_react20.default).createElement((0, import_react20.default).Fragment, null, /* @__PURE__ */ (0, import_react20.default).createElement((0, $d7f64c32b702fe2c$export$8dc98ba7eadeaa56), null, /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$CollectionDocumentContext.Provider, {
    value: document2
  }, props.content)), /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$CollectionInner, {
    render: props.children,
    collection
  }));
}
function $42ceafc619f9c3ba$var$CollectionInner({ collection, render }) {
  return render(collection);
}
function $42ceafc619f9c3ba$var$useSyncExternalStoreFallback(subscribe, getSnapshot, getServerSnapshot) {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let isSSRRef = (0, import_react20.useRef)(isSSR);
  isSSRRef.current = isSSR;
  let getSnapshotWrapper = (0, import_react20.useCallback)(() => {
    return isSSRRef.current ? getServerSnapshot() : getSnapshot();
  }, [
    getSnapshot,
    getServerSnapshot
  ]);
  return (0, import_shim.useSyncExternalStore)(subscribe, getSnapshotWrapper);
}
var $42ceafc619f9c3ba$var$useSyncExternalStore = typeof (0, import_react20.default)["useSyncExternalStore"] === "function" ? (0, import_react20.default)["useSyncExternalStore"] : $42ceafc619f9c3ba$var$useSyncExternalStoreFallback;
function $42ceafc619f9c3ba$var$useCollectionDocument(createCollection) {
  let [document2] = (0, import_react20.useState)(() => new (0, $96ead35620b8fd36$export$b34a105447964f9f)(createCollection?.() || new (0, $6f0c29017aeec335$export$408d25a4e12db025)()));
  let subscribe = (0, import_react20.useCallback)((fn) => document2.subscribe(fn), [
    document2
  ]);
  let getSnapshot = (0, import_react20.useCallback)(() => {
    let collection2 = document2.getCollection();
    if (document2.isSSR)
      document2.resetAfterSSR();
    return collection2;
  }, [
    document2
  ]);
  let getServerSnapshot = (0, import_react20.useCallback)(() => {
    document2.isSSR = true;
    return document2.getCollection();
  }, [
    document2
  ]);
  let collection = $42ceafc619f9c3ba$var$useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    collection,
    document: document2
  };
}
var $42ceafc619f9c3ba$var$SSRContext = /* @__PURE__ */ (0, import_react20.createContext)(null);
function $42ceafc619f9c3ba$var$createCollectionNodeClass(type) {
  var _a;
  let NodeClass = (_a = class extends (0, $6f0c29017aeec335$export$d68d59712b04d9d1) {
  }, _a.type = type, _a);
  return NodeClass;
}
function $42ceafc619f9c3ba$var$useSSRCollectionNode(CollectionNodeClass, props, ref, rendered, children, render) {
  if (typeof CollectionNodeClass === "string")
    CollectionNodeClass = $42ceafc619f9c3ba$var$createCollectionNodeClass(CollectionNodeClass);
  let itemRef = (0, import_react20.useCallback)((element) => {
    element?.setProps(props, ref, CollectionNodeClass, rendered, render);
  }, [
    props,
    ref,
    rendered,
    render,
    CollectionNodeClass
  ]);
  let parentNode = (0, import_react20.useContext)($42ceafc619f9c3ba$var$SSRContext);
  if (parentNode) {
    let element = parentNode.ownerDocument.nodesByProps.get(props);
    if (!element) {
      element = parentNode.ownerDocument.createElement(CollectionNodeClass.type);
      element.setProps(props, ref, CollectionNodeClass, rendered, render);
      parentNode.appendChild(element);
      parentNode.ownerDocument.updateCollection();
      parentNode.ownerDocument.nodesByProps.set(props, element);
    }
    return children ? /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$SSRContext.Provider, {
      value: element
    }, children) : null;
  }
  return /* @__PURE__ */ (0, import_react20.default).createElement(CollectionNodeClass.type, {
    ref: itemRef
  }, children);
}
function $42ceafc619f9c3ba$export$18af5c7a9e9b3664(CollectionNodeClass, render) {
  let Component = ({ node }) => render(node.props, node.props.ref, node);
  let Result = (0, import_react20.forwardRef)((props, ref) => {
    let focusableProps = (0, import_react20.useContext)((0, $d1116acdf220c2da$export$f9762fab77588ecb));
    let isShallow = (0, import_react20.useContext)($42ceafc619f9c3ba$var$ShallowRenderContext);
    if (!isShallow) {
      if (render.length >= 3) throw new Error(render.name + " cannot be rendered outside a collection.");
      return render(props, ref);
    }
    return $42ceafc619f9c3ba$var$useSSRCollectionNode(CollectionNodeClass, props, ref, "children" in props ? props.children : null, null, (node) => (
      // Forward FocusableContext to real DOM tree so tooltips work.
      /* @__PURE__ */ (0, import_react20.default).createElement((0, $d1116acdf220c2da$export$f9762fab77588ecb).Provider, {
        value: focusableProps
      }, /* @__PURE__ */ (0, import_react20.default).createElement(Component, {
        node
      }))
    ));
  });
  Result.displayName = render.name;
  return Result;
}
function $42ceafc619f9c3ba$var$useCollectionChildren(options) {
  return (0, $a80bd3e9349588e7$export$727c8fc270210f13)({
    ...options,
    addIdAndValue: true
  });
}
var $42ceafc619f9c3ba$var$CollectionContext = /* @__PURE__ */ (0, import_react20.createContext)(null);
function $42ceafc619f9c3ba$export$fb8073518f34e6ec(props) {
  let ctx = (0, import_react20.useContext)($42ceafc619f9c3ba$var$CollectionContext);
  let dependencies = (ctx?.dependencies || []).concat(props.dependencies);
  let idScope = props.idScope ?? ctx?.idScope;
  let children = $42ceafc619f9c3ba$var$useCollectionChildren({
    ...props,
    idScope,
    dependencies
  });
  let doc = (0, import_react20.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  if (doc) children = /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$CollectionRoot, null, children);
  ctx = (0, import_react20.useMemo)(
    () => ({
      dependencies: (
        // oxlint-disable-next-line react-hooks/exhaustive-deps
        dependencies
      ),
      idScope
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // oxlint-disable-next-line react/react-compiler, react-hooks/exhaustive-deps
    [
      idScope,
      ...dependencies
    ]
  );
  return /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$CollectionContext.Provider, {
    value: ctx
  }, children);
}
function $42ceafc619f9c3ba$var$CollectionRoot({ children }) {
  let doc = (0, import_react20.useContext)($42ceafc619f9c3ba$var$CollectionDocumentContext);
  let wrappedChildren = (0, import_react20.useMemo)(() => /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$CollectionDocumentContext.Provider, {
    value: null
  }, /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$ShallowRenderContext.Provider, {
    value: true
  }, children)), [
    children
  ]);
  return (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)() ? /* @__PURE__ */ (0, import_react20.default).createElement($42ceafc619f9c3ba$var$SSRContext.Provider, {
    value: doc
  }, wrappedChildren) : /* @__PURE__ */ (0, import_react_dom.createPortal)(wrappedChildren, doc);
}

// node_modules/react-aria-components/dist/private/Collection.mjs
var import_react21 = __toESM(require("react"), 1);
var $263ab7fc0f95ccdb$export$a164736487e3f0ae = {
  CollectionRoot({ collection, renderDropIndicator }) {
    return $263ab7fc0f95ccdb$var$useCollectionRender(collection, null, renderDropIndicator);
  },
  CollectionBranch({ collection, parent, renderDropIndicator }) {
    return $263ab7fc0f95ccdb$var$useCollectionRender(collection, parent, renderDropIndicator);
  }
};
function $263ab7fc0f95ccdb$var$useCollectionRender(collection, parent, renderDropIndicator) {
  return (0, $a80bd3e9349588e7$export$727c8fc270210f13)({
    items: parent ? collection.getChildren(parent.key) : collection,
    dependencies: [
      renderDropIndicator
    ],
    children(node) {
      if (node.type === "content") return /* @__PURE__ */ (0, import_react21.default).createElement((0, import_react21.default).Fragment, null);
      let rendered = node.render(node);
      if (!renderDropIndicator || node.type !== "item") return rendered;
      return /* @__PURE__ */ (0, import_react21.default).createElement((0, import_react21.default).Fragment, null, renderDropIndicator({
        type: "item",
        key: node.key,
        dropPosition: "before"
      }), rendered, $263ab7fc0f95ccdb$export$2dbbd341daed716d(collection, node, renderDropIndicator));
    }
  });
}
function $263ab7fc0f95ccdb$export$2dbbd341daed716d(collection, node, renderDropIndicator) {
  let key = node.key;
  let keyAfter = collection.getKeyAfter(key);
  let nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  while (nextItemInFlattenedCollection != null && nextItemInFlattenedCollection.type !== "item") {
    keyAfter = collection.getKeyAfter(nextItemInFlattenedCollection.key);
    nextItemInFlattenedCollection = keyAfter != null ? collection.getItem(keyAfter) : null;
  }
  let nextItemInSameLevel = node.nextKey != null ? collection.getItem(node.nextKey) : null;
  while (nextItemInSameLevel != null && nextItemInSameLevel.type !== "item") nextItemInSameLevel = nextItemInSameLevel.nextKey != null ? collection.getItem(nextItemInSameLevel.nextKey) : null;
  let afterIndicators = [];
  if (nextItemInSameLevel == null) {
    let current = node;
    while (current?.type === "item" && (!nextItemInFlattenedCollection || current.parentKey !== nextItemInFlattenedCollection.parentKey && nextItemInFlattenedCollection.level < current.level)) {
      let indicator = renderDropIndicator({
        type: "item",
        key: current.key,
        dropPosition: "after"
      });
      if (/* @__PURE__ */ (0, import_react21.isValidElement)(indicator)) afterIndicators.push(/* @__PURE__ */ (0, import_react21.cloneElement)(indicator, {
        key: `${current.key}-after`
      }));
      current = current.parentKey != null ? collection.getItem(current.parentKey) : null;
    }
  }
  return afterIndicators;
}
var $263ab7fc0f95ccdb$export$4feb769f8ddf26c5 = /* @__PURE__ */ (0, import_react21.createContext)($263ab7fc0f95ccdb$export$a164736487e3f0ae);
function $263ab7fc0f95ccdb$export$90e00781bc59d8f9(focusedKey) {
  return (0, import_react21.useMemo)(() => focusedKey != null ? /* @__PURE__ */ new Set([
    focusedKey
  ]) : null, [
    focusedKey
  ]);
}

// node_modules/react-aria/dist/private/utils/filterDOMProps.mjs
var $8e9d2fae0ecb9001$var$DOMPropNames = /* @__PURE__ */ new Set([
  "id"
]);
var $8e9d2fae0ecb9001$var$labelablePropNames = /* @__PURE__ */ new Set([
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-details"
]);
var $8e9d2fae0ecb9001$var$linkPropNames = /* @__PURE__ */ new Set([
  "href",
  "hrefLang",
  "target",
  "rel",
  "download",
  "ping",
  "referrerPolicy"
]);
var $8e9d2fae0ecb9001$var$globalAttrs = /* @__PURE__ */ new Set([
  "dir",
  "lang",
  "hidden",
  "inert",
  "translate",
  "suppressHydrationWarning"
]);
var $8e9d2fae0ecb9001$var$globalEvents = /* @__PURE__ */ new Set([
  "onClick",
  "onAuxClick",
  "onContextMenu",
  "onDoubleClick",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onPointerDown",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerOver",
  "onPointerOut",
  "onGotPointerCapture",
  "onLostPointerCapture",
  "onScroll",
  "onWheel",
  "onAnimationStart",
  "onAnimationEnd",
  "onAnimationIteration",
  "onTransitionCancel",
  "onTransitionEnd",
  "onTransitionRun",
  "onTransitionStart"
]);
var $8e9d2fae0ecb9001$var$propRe = /^(data-.*)$/;
function $8e9d2fae0ecb9001$export$457c3d6518dd4c6f(props, opts = {}) {
  let { labelable, isLink, global, events = global, propNames } = opts;
  let filteredProps = {};
  for (const prop in props) if (Object.prototype.hasOwnProperty.call(props, prop) && ($8e9d2fae0ecb9001$var$DOMPropNames.has(prop) || labelable && $8e9d2fae0ecb9001$var$labelablePropNames.has(prop) || isLink && $8e9d2fae0ecb9001$var$linkPropNames.has(prop) || global && $8e9d2fae0ecb9001$var$globalAttrs.has(prop) || events && ($8e9d2fae0ecb9001$var$globalEvents.has(prop) || prop.endsWith("Capture") && $8e9d2fae0ecb9001$var$globalEvents.has(prop.slice(0, -7))) || propNames?.has(prop) || $8e9d2fae0ecb9001$var$propRe.test(prop))) filteredProps[prop] = props[prop];
  return filteredProps;
}

// node_modules/react-aria/dist/private/interactions/textSelection.mjs
var $cbf007e418543821$var$state = "default";
var $cbf007e418543821$var$savedUserSelect = "";
var $cbf007e418543821$var$modifiedElementMap = /* @__PURE__ */ new WeakMap();
function $cbf007e418543821$export$16a4697467175487(target) {
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
    if ($cbf007e418543821$var$state === "default") {
      const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
      $cbf007e418543821$var$savedUserSelect = documentObject.documentElement.style.webkitUserSelect;
      documentObject.documentElement.style.webkitUserSelect = "none";
    }
    $cbf007e418543821$var$state = "disabled";
  } else if (target instanceof HTMLElement || target instanceof SVGElement) {
    let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
    $cbf007e418543821$var$modifiedElementMap.set(target, target.style[property]);
    target.style[property] = "none";
  }
}
function $cbf007e418543821$export$b0d6fa1ab32e3295(target) {
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
    if ($cbf007e418543821$var$state !== "disabled") return;
    $cbf007e418543821$var$state = "restoring";
    setTimeout(() => {
      (0, $081cb5757e08788e$export$24490316f764c430)(() => {
        if ($cbf007e418543821$var$state === "restoring") {
          const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
          if (documentObject.documentElement.style.webkitUserSelect === "none") documentObject.documentElement.style.webkitUserSelect = $cbf007e418543821$var$savedUserSelect || "";
          $cbf007e418543821$var$savedUserSelect = "";
          $cbf007e418543821$var$state = "default";
        }
      });
    }, 300);
  } else if (target instanceof HTMLElement || target instanceof SVGElement) {
    if (target && $cbf007e418543821$var$modifiedElementMap.has(target)) {
      let targetOldUserSelect = $cbf007e418543821$var$modifiedElementMap.get(target);
      let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
      if (target.style[property] === "none") target.style[property] = targetOldUserSelect;
      if (target.getAttribute("style") === "") target.removeAttribute("style");
      $cbf007e418543821$var$modifiedElementMap.delete(target);
    }
  }
}

// node_modules/react-aria/dist/private/utils/getNonce.mjs
var $2b2d34ff061957fb$var$nonceCache = /* @__PURE__ */ new WeakMap();
function $2b2d34ff061957fb$export$2b85b721e524d74b(doc) {
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(doc);
  let nonce = $2b2d34ff061957fb$var$nonceCache.get(ownerDocument);
  nonce ?? (nonce = (0, $7096878c21af5e66$export$a929f3f93e2cc67e)("csp-nonce", ownerDocument));
  if (nonce !== void 0) $2b2d34ff061957fb$var$nonceCache.set(ownerDocument, nonce);
  return nonce;
}

// node_modules/react-aria/dist/private/interactions/context.mjs
var import_react22 = __toESM(require("react"), 1);
var $24f9a20f226ad820$export$5165eccb35aaadb5 = (0, import_react22.default).createContext({
  register: () => {
  }
});
$24f9a20f226ad820$export$5165eccb35aaadb5.displayName = "PressResponderContext";

// node_modules/react-aria/dist/private/utils/useGlobalListeners.mjs
var import_react23 = require("react");
function $48a7d519b337145d$export$4eaf04e54aa8eed6() {
  let globalListeners = (0, import_react23.useRef)(/* @__PURE__ */ new Map());
  let addGlobalListener = (0, import_react23.useCallback)((eventTarget, type, listener, options) => {
    let fn = options?.once ? (...args) => {
      globalListeners.current.delete(listener);
      listener(...args);
    } : listener;
    globalListeners.current.set(listener, {
      type,
      eventTarget,
      fn,
      options
    });
    eventTarget.addEventListener(type, fn, options);
  }, []);
  let removeGlobalListener = (0, import_react23.useCallback)((eventTarget, type, listener, options) => {
    let fn = globalListeners.current.get(listener)?.fn || listener;
    eventTarget.removeEventListener(type, fn, options);
    globalListeners.current.delete(listener);
  }, []);
  let removeAllGlobalListeners = (0, import_react23.useCallback)(() => {
    globalListeners.current.forEach((value, key) => {
      removeGlobalListener(value.eventTarget, value.type, key, value.options);
    });
  }, [
    removeGlobalListener
  ]);
  (0, import_react23.useEffect)(() => {
    return removeAllGlobalListeners;
  }, [
    removeAllGlobalListeners
  ]);
  return {
    addGlobalListener,
    removeGlobalListener,
    removeAllGlobalListeners
  };
}

// node_modules/react-aria/dist/private/interactions/usePress.mjs
var import_react_dom2 = require("react-dom");
var import_react24 = require("react");
function $d27d541f9569d26d$var$usePressResponderContext(props) {
  let context = (0, import_react24.useContext)((0, $24f9a20f226ad820$export$5165eccb35aaadb5));
  if (context) {
    let { register, ref, ...contextProps } = context;
    props = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(contextProps, props);
    register();
  }
  (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, props.ref);
  return props;
}
var _shouldStopPropagation;
var $d27d541f9569d26d$var$PressEvent = class {
  constructor(type, pointerType, originalEvent, state) {
    __privateAdd(this, _shouldStopPropagation);
    __privateSet(this, _shouldStopPropagation, true);
    let currentTarget = state?.target ?? originalEvent.currentTarget;
    const rect = currentTarget?.getBoundingClientRect();
    let x, y = 0;
    let clientX, clientY = null;
    if (originalEvent.clientX != null && originalEvent.clientY != null) {
      clientX = originalEvent.clientX;
      clientY = originalEvent.clientY;
    }
    if (rect) {
      if (clientX != null && clientY != null) {
        x = clientX - rect.left;
        y = clientY - rect.top;
      } else {
        x = rect.width / 2;
        y = rect.height / 2;
      }
    }
    this.type = type;
    this.pointerType = pointerType;
    this.target = originalEvent.currentTarget;
    this.shiftKey = originalEvent.shiftKey;
    this.metaKey = originalEvent.metaKey;
    this.ctrlKey = originalEvent.ctrlKey;
    this.altKey = originalEvent.altKey;
    this.x = x;
    this.y = y;
    this.key = originalEvent.key;
  }
  continuePropagation() {
    __privateSet(this, _shouldStopPropagation, false);
  }
  get shouldStopPropagation() {
    return __privateGet(this, _shouldStopPropagation);
  }
};
_shouldStopPropagation = new WeakMap();
var $d27d541f9569d26d$var$LINK_CLICKED = Symbol("linkClicked");
var $d27d541f9569d26d$var$STYLE_ID = "react-aria-pressable-style";
var $d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE = "data-react-aria-pressable";
function $d27d541f9569d26d$export$45712eceda6fad21(props) {
  let { onPress, onPressChange, onPressStart, onPressEnd, onPressUp, onClick, isDisabled, isPressed: isPressedProp, preventFocusOnPress, shouldCancelOnPointerExit, allowTextSelectionOnPress, ref: domRef, ...domProps } = $d27d541f9569d26d$var$usePressResponderContext(props);
  let [isPressed, setPressed] = (0, import_react24.useState)(false);
  let ref = (0, import_react24.useRef)({
    isPressed: false,
    ignoreEmulatedMouseEvents: false,
    didFirePressStart: false,
    isTriggeringEvent: false,
    activePointerId: null,
    target: null,
    isOverTarget: false,
    pointerType: null,
    disposables: []
  });
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let triggerPressStart = (0, import_react24.useCallback)((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled || state.didFirePressStart) return false;
    let shouldStopPropagation = true;
    state.isTriggeringEvent = true;
    if (onPressStart) {
      let event = new $d27d541f9569d26d$var$PressEvent("pressstart", pointerType, originalEvent);
      onPressStart(event);
      shouldStopPropagation = event.shouldStopPropagation;
    }
    if (onPressChange) onPressChange(true);
    state.isTriggeringEvent = false;
    state.didFirePressStart = true;
    setPressed(true);
    return shouldStopPropagation;
  }, [
    isDisabled,
    onPressStart,
    onPressChange
  ]);
  let triggerPressEnd = (0, import_react24.useCallback)((originalEvent, pointerType, wasPressed = true) => {
    let state = ref.current;
    if (!state.didFirePressStart) return false;
    state.didFirePressStart = false;
    state.isTriggeringEvent = true;
    let shouldStopPropagation = true;
    if (onPressEnd) {
      let event = new $d27d541f9569d26d$var$PressEvent("pressend", pointerType, originalEvent);
      onPressEnd(event);
      shouldStopPropagation = event.shouldStopPropagation;
    }
    if (onPressChange) onPressChange(false);
    setPressed(false);
    if (onPress && wasPressed && !isDisabled) {
      let event = new $d27d541f9569d26d$var$PressEvent("press", pointerType, originalEvent);
      onPress(event);
      shouldStopPropagation && (shouldStopPropagation = event.shouldStopPropagation);
    }
    state.isTriggeringEvent = false;
    return shouldStopPropagation;
  }, [
    isDisabled,
    onPressEnd,
    onPressChange,
    onPress
  ]);
  let triggerPressEndEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressEnd);
  let triggerPressUp = (0, import_react24.useCallback)((originalEvent, pointerType) => {
    let state = ref.current;
    if (isDisabled) return false;
    if (onPressUp) {
      state.isTriggeringEvent = true;
      let event = new $d27d541f9569d26d$var$PressEvent("pressup", pointerType, originalEvent);
      onPressUp(event);
      state.isTriggeringEvent = false;
      return event.shouldStopPropagation;
    }
    return true;
  }, [
    isDisabled,
    onPressUp
  ]);
  let triggerPressUpEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressUp);
  let cancel = (0, import_react24.useCallback)((e) => {
    let state = ref.current;
    if (state.isPressed && state.target) {
      if (state.didFirePressStart && state.pointerType != null) triggerPressEnd($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType, false);
      state.isPressed = false;
      state.isOverTarget = false;
      state.activePointerId = null;
      state.pointerType = null;
      removeAllGlobalListeners();
      if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    }
  }, [
    allowTextSelectionOnPress,
    removeAllGlobalListeners,
    triggerPressEnd
  ]);
  let cancelEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(cancel);
  (0, import_react24.useEffect)(() => {
    if (isDisabled && ref.current.isPressed) cancelEvent({
      currentTarget: ref.current.target,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
  }, [
    isDisabled
  ]);
  let cancelOnPointerExit = (0, import_react24.useCallback)((e) => {
    if (shouldCancelOnPointerExit) cancel(e);
  }, [
    shouldCancelOnPointerExit,
    cancel
  ]);
  let triggerClick = (0, import_react24.useCallback)((e) => {
    if (isDisabled) return;
    onClick?.(e);
  }, [
    isDisabled,
    onClick
  ]);
  let triggerSyntheticClick = (0, import_react24.useCallback)((e, target) => {
    if (isDisabled) return;
    if (onClick) {
      let event = new MouseEvent("click", e);
      (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(event, target);
      onClick((0, $a92dc41f639950be$export$525bc4921d56d4a)(event));
    }
  }, [
    isDisabled,
    onClick
  ]);
  let pressProps = (0, import_react24.useMemo)(() => {
    let state = ref.current;
    let pressProps2 = {
      onKeyDown(e) {
        if ($d27d541f9569d26d$var$isValidKeyboardEvent(e.nativeEvent, e.currentTarget) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
          if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), e.key)) e.preventDefault();
          let shouldStopPropagation = true;
          if (!state.isPressed && !e.repeat) {
            state.target = e.currentTarget;
            state.isPressed = true;
            state.pointerType = "keyboard";
            shouldStopPropagation = triggerPressStart(e, "keyboard");
          }
          let originalTarget = e.currentTarget;
          let pressUp = (e2) => {
            if ($d27d541f9569d26d$var$isValidKeyboardEvent(e2, originalTarget) && !e2.repeat && (0, $23f2114a1b82827e$export$4282f70798064fe0)(originalTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e2)) && state.target) triggerPressUpEvent($d27d541f9569d26d$var$createEvent(state.target, e2), "keyboard");
          };
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "keyup", (0, $a4e76a5424781910$export$e08e3b67e392101e)(pressUp, onKeyUp), true);
          if (shouldStopPropagation) e.stopPropagation();
          if (e.metaKey && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) state.metaKeyEvents?.set(e.key, e.nativeEvent);
        } else if (e.key === "Meta") state.metaKeyEvents = /* @__PURE__ */ new Map();
      },
      onClick(e) {
        if (e && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (e && e.button === 0 && !state.isTriggeringEvent && !(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening) {
          let shouldStopPropagation = true;
          if (isDisabled) e.preventDefault();
          if (!state.ignoreEmulatedMouseEvents && !state.isPressed && (state.pointerType === "virtual" || (0, $b5c62b033c25b96d$export$60278871457622de)(e.nativeEvent))) {
            let stopPressStart = triggerPressStart(e, "virtual");
            let stopPressUp = triggerPressUpEvent(e, "virtual");
            let stopPressEnd = triggerPressEndEvent(e, "virtual");
            triggerClick(e);
            shouldStopPropagation = stopPressStart && stopPressUp && stopPressEnd;
          } else if (state.isPressed && state.pointerType !== "keyboard") {
            let pointerType = state.pointerType || e.nativeEvent.pointerType || "virtual";
            let stopPressUp = triggerPressUpEvent($d27d541f9569d26d$var$createEvent(e.currentTarget, e), pointerType);
            let stopPressEnd = triggerPressEndEvent($d27d541f9569d26d$var$createEvent(e.currentTarget, e), pointerType, true);
            shouldStopPropagation = stopPressUp && stopPressEnd;
            state.isOverTarget = false;
            triggerClick(e);
            cancelEvent(e);
          }
          state.ignoreEmulatedMouseEvents = false;
          if (shouldStopPropagation) e.stopPropagation();
        }
      }
    };
    let onKeyUp = (e) => {
      if (state.isPressed && state.target && $d27d541f9569d26d$var$isValidKeyboardEvent(e, state.target)) {
        if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), e.key)) e.preventDefault();
        let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
        let wasPressed = (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target);
        triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e), "keyboard", wasPressed);
        if (wasPressed) triggerSyntheticClick(e, state.target);
        removeAllGlobalListeners();
        if (e.key !== "Enter" && $d27d541f9569d26d$var$isHTMLAnchorLink(state.target) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target) && !e[$d27d541f9569d26d$var$LINK_CLICKED]) {
          e[$d27d541f9569d26d$var$LINK_CLICKED] = true;
          (0, $caaf0dd3060ed57c$export$95185d699e05d4d7)(state.target, e, false);
        }
        state.isPressed = false;
        state.metaKeyEvents?.delete(e.key);
      } else if (e.key === "Meta" && state.metaKeyEvents?.size) {
        let events = state.metaKeyEvents;
        state.metaKeyEvents = void 0;
        for (let event of events.values()) state.target?.dispatchEvent(new KeyboardEvent("keyup", event));
      }
    };
    if (typeof PointerEvent !== "undefined") {
      pressProps2.onPointerDown = (e) => {
        if (e.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if ((0, $b5c62b033c25b96d$export$29bf1b5f2c56cf63)(e.nativeEvent)) {
          state.pointerType = "virtual";
          return;
        }
        state.pointerType = e.pointerType;
        let shouldStopPropagation = true;
        if (!state.isPressed) {
          state.isPressed = true;
          state.isOverTarget = true;
          state.activePointerId = e.pointerId;
          state.target = e.currentTarget;
          if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
          shouldStopPropagation = triggerPressStart(e, state.pointerType);
          let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
          if ("releasePointerCapture" in target) {
            if ("hasPointerCapture" in target) {
              if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
            } else target.releasePointerCapture(e.pointerId);
          }
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "pointerup", onPointerUp, false);
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "pointercancel", onPointerCancel, false);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseDown = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (e.button === 0) {
          if (preventFocusOnPress) {
            let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e.target);
            if (dispose) state.disposables.push(dispose);
          }
          e.stopPropagation();
        }
      };
      pressProps2.onPointerUp = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || state.pointerType === "virtual") return;
        if (e.button === 0 && !state.isPressed) triggerPressUpEvent(e, state.pointerType || e.pointerType);
      };
      pressProps2.onPointerEnter = (e) => {
        if (e.pointerId === state.activePointerId && state.target && !state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = true;
          triggerPressStart($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType);
        }
      };
      pressProps2.onPointerLeave = (e) => {
        if (e.pointerId === state.activePointerId && state.target && state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = false;
          triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e), state.pointerType, false);
          cancelOnPointerExit(e);
        }
      };
      let onPointerUp = (e) => {
        if (e.pointerId === state.activePointerId && state.isPressed && e.button === 0 && state.target) {
          if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) && state.pointerType != null) {
            let clicked = false;
            let timeout = setTimeout(() => {
              if (state.isPressed && state.target instanceof HTMLElement) {
                if (clicked) cancelEvent(e);
                else {
                  (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(state.target);
                  state.target.click();
                }
              }
            }, 80);
            addGlobalListener(e.currentTarget, "click", () => clicked = true, true);
            state.disposables.push(() => clearTimeout(timeout));
          } else cancelEvent(e);
          state.isOverTarget = false;
        }
      };
      let onPointerCancel = (e) => {
        cancelEvent(e);
      };
      pressProps2.onDragStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        cancelEvent(e);
      };
    } else if (false) {
      pressProps2.onMouseDown = (e) => {
        if (e.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (state.ignoreEmulatedMouseEvents) {
          e.stopPropagation();
          return;
        }
        state.isPressed = true;
        state.isOverTarget = true;
        state.target = e.currentTarget;
        state.pointerType = (0, $b5c62b033c25b96d$export$60278871457622de)(e.nativeEvent) ? "virtual" : "mouse";
        let shouldStopPropagation = (0, import_react_dom2.flushSync)(() => triggerPressStart(e, state.pointerType));
        if (shouldStopPropagation) e.stopPropagation();
        if (preventFocusOnPress) {
          let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e.target);
          if (dispose) state.disposables.push(dispose);
        }
        addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e.currentTarget), "mouseup", onMouseUp, false);
      };
      pressProps2.onMouseEnter = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let shouldStopPropagation = true;
        if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
          state.isOverTarget = true;
          shouldStopPropagation = triggerPressStart(e, state.pointerType);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseLeave = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let shouldStopPropagation = true;
        if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
          state.isOverTarget = false;
          shouldStopPropagation = triggerPressEndEvent(e, state.pointerType, false);
          cancelOnPointerExit(e);
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onMouseUp = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.ignoreEmulatedMouseEvents && e.button === 0 && !state.isPressed) triggerPressUpEvent(e, state.pointerType || "mouse");
      };
      let onMouseUp = (e) => {
        if (e.button !== 0) return;
        if (state.ignoreEmulatedMouseEvents) {
          state.ignoreEmulatedMouseEvents = false;
          return;
        }
        if (state.target && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) && state.pointerType != null) ;
        else cancelEvent(e);
        state.isOverTarget = false;
      };
      pressProps2.onTouchStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        let touch = $d27d541f9569d26d$var$getTouchFromEvent(e.nativeEvent);
        if (!touch) return;
        state.activePointerId = touch.identifier;
        state.ignoreEmulatedMouseEvents = true;
        state.isOverTarget = true;
        state.isPressed = true;
        state.target = e.currentTarget;
        state.pointerType = "touch";
        if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
        let shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
        if (shouldStopPropagation) e.stopPropagation();
        addGlobalListener((0, $d447af545b77c9f1$export$f21a1ffae260145a)(e.currentTarget), "scroll", onScroll, true);
      };
      pressProps2.onTouchMove = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $d27d541f9569d26d$var$getTouchById(e.nativeEvent, state.activePointerId);
        let shouldStopPropagation = true;
        if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e.currentTarget)) {
          if (!state.isOverTarget && state.pointerType != null) {
            state.isOverTarget = true;
            shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          }
        } else if (state.isOverTarget && state.pointerType != null) {
          state.isOverTarget = false;
          shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType, false);
          cancelOnPointerExit($d27d541f9569d26d$var$createTouchEvent(state.target, e));
        }
        if (shouldStopPropagation) e.stopPropagation();
      };
      pressProps2.onTouchEnd = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        if (!state.isPressed) {
          e.stopPropagation();
          return;
        }
        let touch = $d27d541f9569d26d$var$getTouchById(e.nativeEvent, state.activePointerId);
        let shouldStopPropagation = true;
        if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e.currentTarget) && state.pointerType != null) {
          triggerPressUpEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType);
          triggerSyntheticClick(e.nativeEvent, state.target);
        } else if (state.isOverTarget && state.pointerType != null) shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e), state.pointerType, false);
        if (shouldStopPropagation) e.stopPropagation();
        state.isPressed = false;
        state.activePointerId = null;
        state.isOverTarget = false;
        state.ignoreEmulatedMouseEvents = true;
        if (state.target && !allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
        removeAllGlobalListeners();
      };
      pressProps2.onTouchCancel = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        e.stopPropagation();
        if (state.isPressed) cancelEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e));
      };
      let onScroll = (e) => {
        if (state.isPressed && (0, $23f2114a1b82827e$export$4282f70798064fe0)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), state.target)) cancelEvent({
          currentTarget: state.target,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
          altKey: false
        });
      };
      pressProps2.onDragStart = (e) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
        cancelEvent(e);
      };
    }
    return pressProps2;
  }, [
    addGlobalListener,
    isDisabled,
    preventFocusOnPress,
    removeAllGlobalListeners,
    allowTextSelectionOnPress,
    cancelOnPointerExit,
    triggerPressStart,
    triggerClick,
    triggerSyntheticClick
  ]);
  (0, import_react24.useEffect)(() => {
    if (!domRef || false) return;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(domRef.current);
    if (!ownerDocument || !ownerDocument.head || ownerDocument.getElementById($d27d541f9569d26d$var$STYLE_ID)) return;
    const style = ownerDocument.createElement("style");
    style.id = $d27d541f9569d26d$var$STYLE_ID;
    let nonce = (0, $2b2d34ff061957fb$export$2b85b721e524d74b)(ownerDocument);
    if (nonce) style.nonce = nonce;
    style.textContent = `
@layer {
  [${$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE}] {
    touch-action: pan-x pan-y pinch-zoom;
  }
}
    `.trim();
    ownerDocument.head.prepend(style);
  }, [
    domRef
  ]);
  (0, import_react24.useEffect)(() => {
    let state = ref.current;
    return () => {
      if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target ?? void 0);
      for (let dispose of state.disposables) dispose();
      state.disposables = [];
    };
  }, [
    allowTextSelectionOnPress
  ]);
  return {
    isPressed: isPressedProp || isPressed,
    // oxlint-disable-next-line react/react-compiler
    pressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, pressProps, {
      [$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE]: true
    })
  };
}
function $d27d541f9569d26d$var$isHTMLAnchorLink(target) {
  return target.tagName === "A" && target.hasAttribute("href");
}
function $d27d541f9569d26d$var$isValidKeyboardEvent(event, currentTarget) {
  const { key, code } = event;
  const element = currentTarget;
  const role = element.getAttribute("role");
  return (key === "Enter" || key === " " || key === "Spacebar" || code === "Space") && !(element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLInputElement && !$d27d541f9569d26d$var$isValidInputKey(element, key) || element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLTextAreaElement || element.isContentEditable) && // Links should only trigger with Enter key
  !((role === "link" || !role && $d27d541f9569d26d$var$isHTMLAnchorLink(element)) && key !== "Enter");
}
function $d27d541f9569d26d$var$createEvent(target, e) {
  let clientX = e.clientX;
  let clientY = e.clientY;
  return {
    currentTarget: target,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    clientX,
    clientY,
    key: e.key
  };
}
function $d27d541f9569d26d$var$shouldPreventDefaultUp(target) {
  if (target instanceof HTMLInputElement) return false;
  if (target instanceof HTMLButtonElement) return target.type !== "submit" && target.type !== "reset";
  if ($d27d541f9569d26d$var$isHTMLAnchorLink(target)) return false;
  return true;
}
function $d27d541f9569d26d$var$shouldPreventDefaultKeyboard(target, key) {
  if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && key === "Enter") return false;
  if (target instanceof HTMLInputElement) {
    if (key === "Enter" && (target.type === "checkbox" || target.type === "radio"))
      return false;
    return !$d27d541f9569d26d$var$isValidInputKey(target, key);
  }
  return $d27d541f9569d26d$var$shouldPreventDefaultUp(target);
}
var $d27d541f9569d26d$var$nonTextInputTypes = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function $d27d541f9569d26d$var$isValidInputKey(target, key) {
  return target.type === "checkbox" || target.type === "radio" ? key === " " : $d27d541f9569d26d$var$nonTextInputTypes.has(target.type);
}

// node_modules/react-aria/dist/private/interactions/useFocusWithin.mjs
var import_react25 = require("react");
function $2c9edc598a03d523$export$420e68273165f4ec(props) {
  let { isDisabled, onBlurWithin, onFocusWithin, onFocusWithinChange } = props;
  let state = (0, import_react25.useRef)({
    isFocusWithin: false
  });
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let onBlur = (0, import_react25.useCallback)((e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, e.relatedTarget)) {
      state.current.isFocusWithin = false;
      removeAllGlobalListeners();
      if (onBlurWithin) onBlurWithin(e);
      if (onFocusWithinChange) onFocusWithinChange(false);
    }
  }, [
    onBlurWithin,
    onFocusWithinChange,
    state,
    removeAllGlobalListeners
  ]);
  let onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
  let onFocus = (0, import_react25.useCallback)((e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
    const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
    if (!state.current.isFocusWithin && activeElement === eventTarget) {
      if (onFocusWithin) onFocusWithin(e);
      if (onFocusWithinChange) onFocusWithinChange(true);
      state.current.isFocusWithin = true;
      onSyntheticFocus(e);
      let currentTarget = e.currentTarget;
      addGlobalListener(ownerDocument, "focus", (e2) => {
        let eventTarget2 = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e2);
        if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentTarget, eventTarget2)) {
          let nativeEvent = new ownerDocument.defaultView.FocusEvent("blur", {
            relatedTarget: eventTarget2
          });
          (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(nativeEvent, currentTarget);
          let event = (0, $a92dc41f639950be$export$525bc4921d56d4a)(nativeEvent);
          onBlur(event);
        }
      }, {
        capture: true
      });
    }
  }, [
    onFocusWithin,
    onFocusWithinChange,
    onSyntheticFocus,
    addGlobalListener,
    onBlur
  ]);
  if (isDisabled) return {
    focusWithinProps: {
      // These cannot be null, that would conflict in mergeProps
      onFocus: void 0,
      onBlur: void 0
    }
  };
  return {
    focusWithinProps: {
      onFocus,
      onBlur
    }
  };
}

// node_modules/react-aria/dist/private/focus/useFocusRing.mjs
var import_react26 = require("react");
function $0c4a58759813079a$export$4e328f61c538687f(props = {}) {
  let { autoFocus = false, isTextInput, within } = props;
  let state = (0, import_react26.useRef)({
    isFocused: false,
    isFocusVisible: autoFocus || (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)()
  });
  let [isFocused, setFocused] = (0, import_react26.useState)(false);
  let [isFocusVisibleState, setFocusVisible] = (0, import_react26.useState)(
    // oxlint-disable-next-line react/react-compiler
    () => state.current.isFocused && state.current.isFocusVisible
  );
  let updateState = (0, import_react26.useCallback)(() => setFocusVisible(state.current.isFocused && state.current.isFocusVisible), []);
  let onFocusChange = (0, import_react26.useCallback)((isFocused2) => {
    state.current.isFocused = isFocused2;
    state.current.isFocusVisible = (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)();
    setFocused(isFocused2);
    updateState();
  }, [
    updateState
  ]);
  (0, $8f5a2122b0992be3$export$ec71b4b83ac08ec3)((isFocusVisible) => {
    state.current.isFocusVisible = isFocusVisible;
    updateState();
  }, [
    isTextInput,
    isFocused
  ], {
    enabled: isFocused,
    isTextInput
  });
  let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)({
    isDisabled: within,
    onFocusChange
  });
  let { focusWithinProps } = (0, $2c9edc598a03d523$export$420e68273165f4ec)({
    isDisabled: !within,
    onFocusWithinChange: onFocusChange
  });
  return {
    isFocused,
    isFocusVisible: isFocusVisibleState,
    focusProps: within ? focusWithinProps : focusProps
  };
}

// node_modules/react-aria/dist/private/interactions/useHover.mjs
var import_react27 = require("react");
var $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
var $e969f22b6713ca4a$var$hoverCount = 0;
function $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents() {
  $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = true;
  setTimeout(() => {
    $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
  }, 500);
}
function $e969f22b6713ca4a$var$handleGlobalPointerEvent(e) {
  if (e.pointerType === "touch") $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents();
}
function $e969f22b6713ca4a$var$setupGlobalTouchEvents() {
  let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(null);
  if (typeof ownerDocument === "undefined") return;
  if ($e969f22b6713ca4a$var$hoverCount === 0) {
    if (typeof PointerEvent !== "undefined") ownerDocument.addEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
    else if (false) ownerDocument.addEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
  }
  $e969f22b6713ca4a$var$hoverCount++;
  return () => {
    $e969f22b6713ca4a$var$hoverCount--;
    if ($e969f22b6713ca4a$var$hoverCount > 0) return;
    if (typeof PointerEvent !== "undefined") ownerDocument.removeEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
    else if (false) ownerDocument.removeEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
  };
}
function $e969f22b6713ca4a$export$ae780daf29e6d456(props) {
  let { onHoverStart, onHoverChange, onHoverEnd, isDisabled } = props;
  let [isHovered, setHovered] = (0, import_react27.useState)(false);
  let state = (0, import_react27.useRef)({
    isHovered: false,
    ignoreEmulatedMouseEvents: false,
    pointerType: "",
    target: null
  }).current;
  (0, import_react27.useEffect)($e969f22b6713ca4a$var$setupGlobalTouchEvents, []);
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let { hoverProps, triggerHoverEnd } = (0, import_react27.useMemo)(() => {
    let triggerHoverStart = (event, pointerType) => {
      state.pointerType = pointerType;
      if (isDisabled || pointerType === "touch" || state.isHovered || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(event.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event))) return;
      state.isHovered = true;
      let target = event.currentTarget;
      state.target = target;
      addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event)), "pointerover", (e) => {
        if (state.isHovered && state.target && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)))
          triggerHoverEnd2(e, e.pointerType);
      }, {
        capture: true
      });
      if (onHoverStart) onHoverStart({
        type: "hoverstart",
        target,
        pointerType
      });
      if (onHoverChange) onHoverChange(true);
      setHovered(true);
    };
    let triggerHoverEnd2 = (event, pointerType) => {
      let target = state.target;
      state.pointerType = "";
      state.target = null;
      if (pointerType === "touch" || !state.isHovered || !target) return;
      state.isHovered = false;
      removeAllGlobalListeners();
      if (onHoverEnd) onHoverEnd({
        type: "hoverend",
        target,
        pointerType
      });
      if (onHoverChange) onHoverChange(false);
      setHovered(false);
    };
    let hoverProps2 = {};
    if (typeof PointerEvent !== "undefined") {
      hoverProps2.onPointerEnter = (e) => {
        if ($e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents && e.pointerType === "mouse") return;
        triggerHoverStart(e, e.pointerType);
      };
      hoverProps2.onPointerLeave = (e) => {
        if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) triggerHoverEnd2(e, e.pointerType);
      };
    } else if (false) {
      hoverProps2.onTouchStart = () => {
        state.ignoreEmulatedMouseEvents = true;
      };
      hoverProps2.onMouseEnter = (e) => {
        if (!state.ignoreEmulatedMouseEvents && !$e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents) triggerHoverStart(e, "mouse");
        state.ignoreEmulatedMouseEvents = false;
      };
      hoverProps2.onMouseLeave = (e) => {
        if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) triggerHoverEnd2(e, "mouse");
      };
    }
    return {
      hoverProps: hoverProps2,
      triggerHoverEnd: triggerHoverEnd2
    };
  }, [
    onHoverStart,
    onHoverChange,
    onHoverEnd,
    isDisabled,
    state,
    addGlobalListener,
    removeAllGlobalListeners
  ]);
  (0, import_react27.useEffect)(() => {
    if (isDisabled) triggerHoverEnd({
      currentTarget: state.target
    }, state.pointerType);
  }, [
    isDisabled
  ]);
  return {
    hoverProps,
    isHovered
  };
}

// node_modules/react-aria-components/dist/private/Button.mjs
var import_react28 = __toESM(require("react"), 1);
var $7705c033048f6da7$export$24d547caef80ccd1 = /* @__PURE__ */ (0, import_react28.createContext)({});

// node_modules/react-aria-components/dist/private/Heading.mjs
var import_react29 = __toESM(require("react"), 1);
var $2ec61d1d4f780267$export$d688439359537581 = /* @__PURE__ */ (0, import_react29.createContext)({});
var $2ec61d1d4f780267$export$a8a3e93435678ff9 = /* @__PURE__ */ (0, import_react29.forwardRef)(function Heading(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $2ec61d1d4f780267$export$d688439359537581);
  let { children, level = 3, className, ...domProps } = props;
  let Element2 = (0, $7230ffa83bc0c2cf$export$df3a06d6289f983e)[`h${level}`];
  return /* @__PURE__ */ (0, import_react29.default).createElement(Element2, {
    ...domProps,
    ref,
    className: className ?? "react-aria-Heading"
  }, children);
});

// node_modules/react-aria-components/dist/private/Text.mjs
var import_react30 = __toESM(require("react"), 1);
var $efe09c6d1c304b50$export$9afb8bc826b033ea = /* @__PURE__ */ (0, import_react30.createContext)({});

// node_modules/react-aria/dist/private/utils/isScrollable.mjs
function $901761b40e390936$export$2bb74740c4e19def(node, checkForOverflow) {
  if (!node) return false;
  let style = window.getComputedStyle(node);
  let root = document.scrollingElement || document.documentElement;
  let isScrollable = /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
  if (node === root && style.overflow !== "hidden") isScrollable = true;
  if (isScrollable && checkForOverflow) isScrollable = node.scrollHeight !== node.clientHeight || node.scrollWidth !== node.clientWidth;
  return isScrollable;
}

// node_modules/react-aria/dist/private/utils/getScrollParent.mjs
function $3578607fe3d4b096$export$cfa2225e87938781(node, checkForOverflow) {
  let scrollableNode = node;
  if ((0, $901761b40e390936$export$2bb74740c4e19def)(scrollableNode, checkForOverflow)) scrollableNode = scrollableNode.parentElement;
  while (scrollableNode && !(0, $901761b40e390936$export$2bb74740c4e19def)(scrollableNode, checkForOverflow)) scrollableNode = scrollableNode.parentElement;
  return scrollableNode || document.scrollingElement || document.documentElement;
}

// node_modules/react-aria/dist/private/utils/getScrollParents.mjs
function $76d97191f0f90600$export$94ed1c92c7beeb22(node, checkForOverflow) {
  let parentElements = [];
  let root = document.scrollingElement || document.documentElement;
  while (node) {
    if ((0, $901761b40e390936$export$2bb74740c4e19def)(node, checkForOverflow)) parentElements.push(node);
    if (node === root) break;
    node = node.parentElement;
  }
  return parentElements;
}

// node_modules/react-aria/dist/private/utils/scrollIntoView.mjs
function $51a3e22a5186a962$export$53a0910f038337bd(scrollView, element, opts = {}) {
  if (scrollView === element) return;
  let target = element.getBoundingClientRect();
  $51a3e22a5186a962$export$f064fd83a2c6e9ca(scrollView, element, target, opts);
}
function $51a3e22a5186a962$export$f064fd83a2c6e9ca(scrollView, element, target, opts = {}) {
  let { block = "nearest", inline = "nearest" } = opts;
  let y = scrollView.scrollTop;
  let x = scrollView.scrollLeft;
  let view = scrollView.getBoundingClientRect();
  let itemStyle = window.getComputedStyle(element);
  let viewStyle = window.getComputedStyle(scrollView);
  let root = document.scrollingElement || document.documentElement;
  let isRoot = scrollView === root;
  let viewTop = scrollView === root ? 0 : view.top;
  let viewBottom = scrollView === root ? scrollView.clientHeight : view.bottom;
  let viewLeft = scrollView === root ? 0 : view.left;
  let viewRight = scrollView === root ? scrollView.clientWidth : view.right;
  let scrollMarginTop = parseFloat(itemStyle.scrollMarginTop) || 0;
  let scrollMarginBottom = parseFloat(itemStyle.scrollMarginBottom) || 0;
  let scrollMarginLeft = parseFloat(itemStyle.scrollMarginLeft) || 0;
  let scrollMarginRight = parseFloat(itemStyle.scrollMarginRight) || 0;
  let scrollPaddingTop = parseFloat(viewStyle.scrollPaddingTop) || 0;
  let scrollPaddingBottom = parseFloat(viewStyle.scrollPaddingBottom) || 0;
  let scrollPaddingLeft = parseFloat(viewStyle.scrollPaddingLeft) || 0;
  let scrollPaddingRight = parseFloat(viewStyle.scrollPaddingRight) || 0;
  let borderTopWidth = parseFloat(viewStyle.borderTopWidth) || 0;
  let borderBottomWidth = parseFloat(viewStyle.borderBottomWidth) || 0;
  let borderLeftWidth = parseFloat(viewStyle.borderLeftWidth) || 0;
  let borderRightWidth = parseFloat(viewStyle.borderRightWidth) || 0;
  let scrollAreaTop = target.top - scrollMarginTop;
  let scrollAreaBottom = target.bottom + scrollMarginBottom;
  let scrollAreaLeft = target.left - scrollMarginLeft;
  let scrollAreaRight = target.right + scrollMarginRight;
  let scrollBarOffsetX = scrollView === root ? 0 : borderLeftWidth + borderRightWidth;
  let scrollBarOffsetY = scrollView === root ? 0 : borderTopWidth + borderBottomWidth;
  let scrollBarWidth = scrollView === root ? 0 : scrollView.offsetWidth - scrollView.clientWidth - scrollBarOffsetX;
  let scrollBarHeight = scrollView === root ? 0 : scrollView.offsetHeight - scrollView.clientHeight - scrollBarOffsetY;
  let scrollPortTop = viewTop + (isRoot ? 0 : borderTopWidth) + scrollPaddingTop;
  let scrollPortBottom = viewBottom - (isRoot ? 0 : borderBottomWidth) - scrollPaddingBottom - scrollBarHeight;
  let scrollPortLeft = viewLeft + (isRoot ? 0 : borderLeftWidth) + scrollPaddingLeft;
  let scrollPortRight = viewRight - (isRoot ? 0 : borderRightWidth) - scrollPaddingRight;
  if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)() || viewStyle.direction === "ltr") scrollPortRight -= scrollBarWidth;
  else if (viewStyle.direction === "rtl") scrollPortLeft += scrollBarWidth;
  let shouldScrollBlock = scrollAreaTop < scrollPortTop || scrollAreaBottom > scrollPortBottom;
  let shouldScrollInline = scrollAreaLeft < scrollPortLeft || scrollAreaRight > scrollPortRight;
  if (shouldScrollBlock && block === "start") y += scrollAreaTop - scrollPortTop;
  else if (shouldScrollBlock && block === "center") y += (scrollAreaTop + scrollAreaBottom) / 2 - (scrollPortTop + scrollPortBottom) / 2;
  else if (shouldScrollBlock && block === "end") y += scrollAreaBottom - scrollPortBottom;
  else if (shouldScrollBlock && block === "nearest") {
    let start = scrollAreaTop - scrollPortTop;
    let end = scrollAreaBottom - scrollPortBottom;
    y += Math.abs(start) <= Math.abs(end) ? start : end;
  }
  if (shouldScrollInline && inline === "start") x += scrollAreaLeft - scrollPortLeft;
  else if (shouldScrollInline && inline === "center") x += (scrollAreaLeft + scrollAreaRight) / 2 - (scrollPortLeft + scrollPortRight) / 2;
  else if (shouldScrollInline && inline === "end") x += scrollAreaRight - scrollPortRight;
  else if (shouldScrollInline && inline === "nearest") {
    let start = scrollAreaLeft - scrollPortLeft;
    let end = scrollAreaRight - scrollPortRight;
    x += Math.abs(start) <= Math.abs(end) ? start : end;
  }
  if (false) {
    scrollView.scrollLeft = x;
    scrollView.scrollTop = y;
    return;
  }
  scrollView.scrollTo({
    left: x,
    top: y
  });
}
function $51a3e22a5186a962$export$c826860796309d1b(targetElement, opts = {}) {
  let { containingElement } = opts;
  if (targetElement && targetElement.isConnected) {
    let root = document.scrollingElement || document.documentElement;
    let isScrollPrevented = window.getComputedStyle(root).overflow === "hidden";
    if (!isScrollPrevented) {
      let { left: originalLeft, top: originalTop } = targetElement.getBoundingClientRect();
      targetElement?.scrollIntoView?.({
        block: "nearest"
      });
      let { left: newLeft, top: newTop } = targetElement.getBoundingClientRect();
      if (Math.abs(originalLeft - newLeft) > 1 || Math.abs(originalTop - newTop) > 1) {
        containingElement?.scrollIntoView?.({
          block: "center",
          inline: "center"
        });
        targetElement.scrollIntoView?.({
          block: "nearest"
        });
      }
    } else {
      let { left: originalLeft, top: originalTop } = targetElement.getBoundingClientRect();
      let scrollParents = (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(targetElement, true);
      for (let scrollParent of scrollParents) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, targetElement);
      let { left: newLeft, top: newTop } = targetElement.getBoundingClientRect();
      if (Math.abs(originalLeft - newLeft) > 1 || Math.abs(originalTop - newTop) > 1) {
        scrollParents = containingElement ? (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(containingElement, true) : [];
        for (let scrollParent of scrollParents) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, containingElement, {
          block: "center",
          inline: "center"
        });
        for (let scrollParent of (0, $76d97191f0f90600$export$94ed1c92c7beeb22)(targetElement, true)) $51a3e22a5186a962$export$53a0910f038337bd(scrollParent, targetElement);
      }
    }
  }
}

// node_modules/react-aria/dist/private/utils/useDescription.mjs
var import_react31 = require("react");
var $121970af65029459$var$descriptionId = 0;
var $121970af65029459$var$descriptionNodes = /* @__PURE__ */ new Map();
function $121970af65029459$export$f8aeda7b10753fa1(description) {
  let [id, setId] = (0, import_react31.useState)();
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (!description) return;
    let desc = $121970af65029459$var$descriptionNodes.get(description);
    if (!desc) {
      let id2 = `react-aria-description-${$121970af65029459$var$descriptionId++}`;
      setId(id2);
      let node = document.createElement("div");
      node.id = id2;
      node.style.display = "none";
      node.textContent = description;
      document.body.appendChild(node);
      desc = {
        refCount: 0,
        element: node
      };
      $121970af65029459$var$descriptionNodes.set(description, desc);
    } else setId(desc.element.id);
    desc.refCount++;
    return () => {
      if (desc && --desc.refCount === 0) {
        desc.element.remove();
        $121970af65029459$var$descriptionNodes.delete(description);
      }
    };
  }, [
    description
  ]);
  return {
    "aria-describedby": description ? id : void 0
  };
}

// node_modules/react-aria/dist/private/visually-hidden/VisuallyHidden.mjs
var import_react32 = __toESM(require("react"), 1);
var $ea3928288112382f$var$styles = {
  border: 0,
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
  whiteSpace: "nowrap"
};
function $ea3928288112382f$export$a966af930f325cab(props = {}) {
  let { style, isFocusable } = props;
  let [isFocused, setFocused] = (0, import_react32.useState)(false);
  let { focusWithinProps } = (0, $2c9edc598a03d523$export$420e68273165f4ec)({
    isDisabled: !isFocusable,
    onFocusWithinChange: (val) => setFocused(val)
  });
  let combinedStyles = (0, import_react32.useMemo)(() => {
    if (isFocused)
      return style;
    else if (style) return {
      ...$ea3928288112382f$var$styles,
      ...style
    };
    else return $ea3928288112382f$var$styles;
  }, [
    isFocused
  ]);
  return {
    visuallyHiddenProps: {
      ...focusWithinProps,
      style: combinedStyles
    }
  };
}
function $ea3928288112382f$export$439d29a4e110a164(props) {
  let { children, elementType: Element2 = "div", isFocusable, style, ...otherProps } = props;
  let { visuallyHiddenProps } = $ea3928288112382f$export$a966af930f325cab(props);
  return /* @__PURE__ */ (0, import_react32.default).createElement(Element2, (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(otherProps, visuallyHiddenProps), children);
}

// node_modules/react-aria-components/dist/private/SharedElementTransition.mjs
var import_react_dom3 = require("react-dom");
var import_react33 = __toESM(require("react"), 1);
var $792f28e438b9ad5f$var$SharedElementContext = /* @__PURE__ */ (0, import_react33.createContext)(null);
function $792f28e438b9ad5f$export$758399f318e6385a(props) {
  let ref = (0, import_react33.useRef)({});
  return /* @__PURE__ */ (0, import_react33.default).createElement($792f28e438b9ad5f$var$SharedElementContext.Provider, {
    value: ref
  }, props.children);
}

// node_modules/react-aria-components/dist/private/SelectionIndicator.mjs
var import_react34 = __toESM(require("react"), 1);
var $91fe5e721c7f36c1$export$c9549807523555e0 = /* @__PURE__ */ (0, import_react34.createContext)({
  isSelected: false
});

// node_modules/react-aria/dist/private/utils/shadowdom/ShadowTreeWalker.mjs
var $654b97e09f2a30c1$export$63eb3ababa9c55c4 = class {
  constructor(doc, root, whatToShow, filter) {
    this._walkerStack = [];
    this._currentSetFor = /* @__PURE__ */ new Set();
    this._acceptNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const shadowRoot2 = node.shadowRoot;
        if (shadowRoot2) {
          const walker = this._doc.createTreeWalker(shadowRoot2, this.whatToShow, {
            acceptNode: this._acceptNode
          });
          this._walkerStack.unshift(walker);
          return NodeFilter.FILTER_ACCEPT;
        } else {
          if (typeof this.filter === "function") return this.filter(node);
          else if (this.filter?.acceptNode) return this.filter.acceptNode(node);
          else if (this.filter === null) return NodeFilter.FILTER_ACCEPT;
        }
      }
      return NodeFilter.FILTER_SKIP;
    };
    this._doc = doc;
    this.root = root;
    this.filter = filter ?? null;
    this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
    this._currentNode = root;
    this._walkerStack.unshift(doc.createTreeWalker(root, whatToShow, this._acceptNode));
    const shadowRoot = root.shadowRoot;
    if (shadowRoot) {
      const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      this._walkerStack.unshift(walker);
    }
  }
  get currentNode() {
    return this._currentNode;
  }
  set currentNode(node) {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(this.root, node)) throw new Error("Cannot set currentNode to a node that is not contained by the root node.");
    const walkers = [];
    let curNode = node;
    let currentWalkerCurrentNode = node;
    this._currentNode = node;
    while (curNode && curNode !== this.root) if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const shadowRoot = curNode;
      const walker2 = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      walkers.push(walker2);
      walker2.currentNode = currentWalkerCurrentNode;
      this._currentSetFor.add(walker2);
      curNode = currentWalkerCurrentNode = shadowRoot.host;
    } else curNode = curNode.parentNode;
    const walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
      acceptNode: this._acceptNode
    });
    walkers.push(walker);
    walker.currentNode = currentWalkerCurrentNode;
    this._currentSetFor.add(walker);
    this._walkerStack = walkers;
  }
  get doc() {
    return this._doc;
  }
  firstChild() {
    let currentNode = this.currentNode;
    let newNode = this.nextNode();
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentNode, newNode)) {
      this.currentNode = currentNode;
      return null;
    }
    if (newNode) this.currentNode = newNode;
    return newNode;
  }
  lastChild() {
    let walker = this._walkerStack[0];
    let newNode = walker.lastChild();
    if (newNode) this.currentNode = newNode;
    return newNode;
  }
  nextNode() {
    const nextNode = this._walkerStack[0].nextNode();
    if (nextNode) {
      const shadowRoot = nextNode.shadowRoot;
      if (shadowRoot) {
        let nodeResult;
        if (typeof this.filter === "function") nodeResult = this.filter(nextNode);
        else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(nextNode);
        if (nodeResult === NodeFilter.FILTER_ACCEPT) {
          this.currentNode = nextNode;
          return nextNode;
        }
        let newNode = this.nextNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      }
      if (nextNode) this.currentNode = nextNode;
      return nextNode;
    } else {
      if (this._walkerStack.length > 1) {
        this._walkerStack.shift();
        let newNode = this.nextNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      } else return null;
    }
  }
  previousNode() {
    const currentWalker = this._walkerStack[0];
    if (currentWalker.currentNode === currentWalker.root) {
      if (this._currentSetFor.has(currentWalker)) {
        this._currentSetFor.delete(currentWalker);
        if (this._walkerStack.length > 1) {
          this._walkerStack.shift();
          let newNode = this.previousNode();
          if (newNode) this.currentNode = newNode;
          return newNode;
        } else return null;
      }
      return null;
    }
    const previousNode = currentWalker.previousNode();
    if (previousNode) {
      const shadowRoot = previousNode.shadowRoot;
      if (shadowRoot) {
        let nodeResult;
        if (typeof this.filter === "function") nodeResult = this.filter(previousNode);
        else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(previousNode);
        if (nodeResult === NodeFilter.FILTER_ACCEPT) {
          if (previousNode) this.currentNode = previousNode;
          return previousNode;
        }
        let newNode = this.lastChild();
        if (newNode) this.currentNode = newNode;
        return newNode;
      }
      if (previousNode) this.currentNode = previousNode;
      return previousNode;
    } else {
      if (this._walkerStack.length > 1) {
        this._walkerStack.shift();
        let newNode = this.previousNode();
        if (newNode) this.currentNode = newNode;
        return newNode;
      } else return null;
    }
  }
  /**
  * @deprecated
  */
  nextSibling() {
    return null;
  }
  /**
  * @deprecated
  */
  previousSibling() {
    return null;
  }
  /**
  * @deprecated
  */
  parentNode() {
    return null;
  }
};
function $654b97e09f2a30c1$export$4d0f8be8b12a7ef6(doc, root, whatToShow, filter) {
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return new $654b97e09f2a30c1$export$63eb3ababa9c55c4(doc, root, whatToShow, filter);
  return doc.createTreeWalker(root, whatToShow, filter);
}

// node_modules/react-aria/dist/private/focus/FocusScope.mjs
var import_react35 = __toESM(require("react"), 1);
var $535772f9d2c1f38d$var$FocusContext = /* @__PURE__ */ (0, import_react35.default).createContext(null);
var $535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT = "react-aria-focus-scope-restore";
var $535772f9d2c1f38d$var$activeScope = null;
function $535772f9d2c1f38d$export$20e40289641fbbb6(props) {
  let { children, contain, restoreFocus, autoFocus } = props;
  let startRef = (0, import_react35.useRef)(null);
  let endRef = (0, import_react35.useRef)(null);
  let scopeRef = (0, import_react35.useRef)([]);
  let { parentNode } = (0, import_react35.useContext)($535772f9d2c1f38d$var$FocusContext) || {};
  let node = (0, import_react35.useMemo)(() => new $535772f9d2c1f38d$var$TreeNode({
    scopeRef
  }), [
    scopeRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let parent = parentNode || $535772f9d2c1f38d$export$d06fae2ee68b101e.root;
    if ($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parent.scopeRef) && $535772f9d2c1f38d$var$activeScope && !$535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, parent.scopeRef)) {
      let activeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
      if (activeNode) parent = activeNode;
    }
    parent.addChild(node);
    $535772f9d2c1f38d$export$d06fae2ee68b101e.addNode(node);
  }, [
    node,
    parentNode
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let node2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    if (node2) node2.contain = !!contain;
  }, [
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let node2 = startRef.current?.nextSibling;
    let nodes = [];
    let stopPropagation = (e) => e.stopPropagation();
    while (node2 && node2 !== endRef.current) {
      nodes.push(node2);
      node2.addEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
      node2 = node2.nextSibling;
    }
    scopeRef.current = nodes;
    return () => {
      for (let node3 of nodes) node3.removeEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
    };
  }, [
    children
  ]);
  $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restoreFocus, contain);
  $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain);
  $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain);
  $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus);
  (0, import_react35.useEffect)(() => {
    const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0));
    let scope = null;
    if ($535772f9d2c1f38d$var$isElementInScope(activeElement, scopeRef.current)) {
      for (let node2 of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse()) if (node2.scopeRef && $535772f9d2c1f38d$var$isElementInScope(activeElement, node2.scopeRef.current)) scope = node2;
      if (scope === $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)) $535772f9d2c1f38d$var$activeScope = scope.scopeRef;
    }
  }, [
    scopeRef
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    return () => {
      let parentScope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)?.parent?.scopeRef ?? null;
      if ((scopeRef === $535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope(scopeRef, $535772f9d2c1f38d$var$activeScope)) && (!parentScope || $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parentScope))) $535772f9d2c1f38d$var$activeScope = parentScope;
      $535772f9d2c1f38d$export$d06fae2ee68b101e.removeTreeNode(scopeRef);
    };
  }, [
    scopeRef
  ]);
  let focusManager = (0, import_react35.useMemo)(() => $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef), []);
  let value = (0, import_react35.useMemo)(() => ({
    focusManager,
    parentNode: node
  }), [
    node,
    focusManager
  ]);
  return /* @__PURE__ */ (0, import_react35.default).createElement($535772f9d2c1f38d$var$FocusContext.Provider, {
    value
  }, /* @__PURE__ */ (0, import_react35.default).createElement("span", {
    "data-focus-scope-start": true,
    hidden: true,
    ref: startRef
  }), children, /* @__PURE__ */ (0, import_react35.default).createElement("span", {
    "data-focus-scope-end": true,
    hidden: true,
    ref: endRef
  }));
}
function $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef) {
  return {
    focusNext(opts = {}) {
      let scope = scopeRef.current;
      let { from, tabbable, wrap, accept } = opts;
      let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
      let sentinel = scope[0].previousElementSibling;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
      let nextNode = walker.nextNode();
      if (!nextNode && wrap) {
        walker.currentNode = sentinel;
        nextNode = walker.nextNode();
      }
      if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
      return nextNode;
    },
    focusPrevious(opts = {}) {
      let scope = scopeRef.current;
      let { from, tabbable, wrap, accept } = opts;
      let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
      let sentinel = scope[scope.length - 1].nextElementSibling;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
      let previousNode = walker.previousNode();
      if (!previousNode && wrap) {
        walker.currentNode = sentinel;
        previousNode = walker.previousNode();
      }
      if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
      return previousNode;
    },
    focusFirst(opts = {}) {
      let scope = scopeRef.current;
      let { tabbable, accept } = opts;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[0].previousElementSibling;
      let nextNode = walker.nextNode();
      if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
      return nextNode;
    },
    focusLast(opts = {}) {
      let scope = scopeRef.current;
      let { tabbable, accept } = opts;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable,
        accept
      }, scope);
      walker.currentNode = scope[scope.length - 1].nextElementSibling;
      let previousNode = walker.previousNode();
      if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
      return previousNode;
    }
  };
}
function $535772f9d2c1f38d$var$getScopeRoot(scope) {
  return scope[0].parentElement;
}
function $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) {
  let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
  while (scope && scope.scopeRef !== scopeRef) {
    if (scope.contain) return false;
    scope = scope.parent;
  }
  return true;
}
function $535772f9d2c1f38d$var$getRadiosInGroup(element) {
  if (!element.form)
    return Array.from((0, $d447af545b77c9f1$export$b204af158042fbac)(element).querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)).filter((radio) => !radio.form);
  const radioList = element.form.elements.namedItem(element.name);
  let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
  if (radioList instanceof ownerWindow.RadioNodeList) return Array.from(radioList).filter((el) => el instanceof ownerWindow.HTMLInputElement);
  if (radioList instanceof ownerWindow.HTMLInputElement) return [
    radioList
  ];
  return [];
}
function $535772f9d2c1f38d$var$isTabbableRadio(element) {
  if (element.checked) return true;
  const radios = $535772f9d2c1f38d$var$getRadiosInGroup(element);
  return radios.length > 0 && !radios.some((radio) => radio.checked);
}
function $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain) {
  let focusedNode = (0, import_react35.useRef)(void 0);
  let raf = (0, import_react35.useRef)(void 0);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let scope = scopeRef.current;
    if (!contain) {
      if (raf.current) {
        cancelAnimationFrame(raf.current);
        raf.current = void 0;
      }
      return;
    }
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    let onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      let scope2 = scopeRef.current;
      if (!scope2 || !$535772f9d2c1f38d$var$isElementInScope(focusedElement, scope2)) return;
      let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope2);
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable: true
      }, scope2);
      if (!focusedElement) return;
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      if (!nextElement) {
        walker.currentNode = e.shiftKey ? scope2[scope2.length - 1].nextElementSibling : scope2[0].previousElementSibling;
        nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      }
      e.preventDefault();
      if (nextElement) {
        $535772f9d2c1f38d$var$focusElement(nextElement, true);
        if (nextElement instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(nextElement).HTMLInputElement) nextElement.select();
      }
    };
    let onFocus = (e) => {
      if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), scopeRef.current)) {
        $535772f9d2c1f38d$var$activeScope = scopeRef;
        focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
      } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e), scopeRef)) {
        if (focusedNode.current) $535772f9d2c1f38d$var$focusElement(focusedNode.current);
        else if ($535772f9d2c1f38d$var$activeScope && $535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
      } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef)) focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    };
    let onBlur = (e) => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
        let shouldSkipFocusRestore = (modality === "virtual" || modality === null) && (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && (0, $2add3ce32c6007eb$export$6446a186d09e379e)();
        let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
        if (!shouldSkipFocusRestore && activeElement && $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef)) {
          $535772f9d2c1f38d$var$activeScope = scopeRef;
          let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
          if (target && target.isConnected) {
            focusedNode.current = target;
            $535772f9d2c1f38d$var$focusElement(focusedNode.current);
          } else if ($535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
        }
      });
    };
    ownerDocument.addEventListener("keydown", onKeyDown, false);
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    scope?.forEach((element) => element.addEventListener("focusout", onBlur, false));
    return () => {
      ownerDocument.removeEventListener("keydown", onKeyDown, false);
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
      scope?.forEach((element) => element.removeEventListener("focusout", onBlur, false));
    };
  }, [
    scopeRef,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [
    raf
  ]);
}
function $535772f9d2c1f38d$var$isElementInAnyScope(element) {
  return $535772f9d2c1f38d$var$isElementInChildScope(element);
}
function $535772f9d2c1f38d$var$isElementInScope(element, scope) {
  if (!element) return false;
  if (!scope) return false;
  return scope.some((node) => (0, $23f2114a1b82827e$export$4282f70798064fe0)(node, element));
}
function $535772f9d2c1f38d$var$isElementInChildScope(element, scope = null) {
  if (element instanceof Element && element.closest("[data-react-aria-top-layer]")) return true;
  for (let { scopeRef: s } of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope))) {
    if (s && $535772f9d2c1f38d$var$isElementInScope(element, s.current)) return true;
  }
  return false;
}
function $535772f9d2c1f38d$export$1258395f99bf9cbf(element) {
  return $535772f9d2c1f38d$var$isElementInChildScope(element, $535772f9d2c1f38d$var$activeScope);
}
function $535772f9d2c1f38d$var$isAncestorScope(ancestor, scope) {
  let parent = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope)?.parent;
  while (parent) {
    if (parent.scopeRef === ancestor) return true;
    parent = parent.parent;
  }
  return false;
}
function $535772f9d2c1f38d$var$focusElement(element, scroll = false) {
  if (element != null && !scroll) try {
    (0, $f192c2f16961cbe0$export$80f3e147d781571c)(element);
  } catch {
  }
  else if (element != null) try {
    element.focus();
  } catch {
  }
}
function $535772f9d2c1f38d$var$getFirstInScope(scope, tabbable = true) {
  let sentinel = scope[0].previousElementSibling;
  let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
  let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
    tabbable
  }, scope);
  walker.currentNode = sentinel;
  let nextNode = walker.nextNode();
  if (tabbable && !nextNode) {
    scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
    walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
      tabbable: false
    }, scope);
    walker.currentNode = sentinel;
    nextNode = walker.nextNode();
  }
  return nextNode;
}
function $535772f9d2c1f38d$var$focusFirstInScope(scope, tabbable = true) {
  $535772f9d2c1f38d$var$focusElement($535772f9d2c1f38d$var$getFirstInScope(scope, tabbable));
}
function $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus) {
  const autoFocusRef = (0, import_react35.default).useRef(autoFocus);
  (0, import_react35.useEffect)(() => {
    if (autoFocusRef.current) {
      $535772f9d2c1f38d$var$activeScope = scopeRef;
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
      if (!$535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), $535772f9d2c1f38d$var$activeScope.current) && scopeRef.current) $535772f9d2c1f38d$var$focusFirstInScope(scopeRef.current);
    }
    autoFocusRef.current = false;
  }, [
    scopeRef
  ]);
}
function $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restore, contain) {
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (restore || contain) return;
    let scope = scopeRef.current;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    let onFocus = (e) => {
      let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
      if ($535772f9d2c1f38d$var$isElementInScope(target, scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
      else if (!$535772f9d2c1f38d$var$isElementInAnyScope(target)) $535772f9d2c1f38d$var$activeScope = null;
    };
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    return () => {
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
    };
  }, [
    scopeRef,
    restore,
    contain
  ]);
}
function $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef) {
  let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
  while (scope && scope.scopeRef !== scopeRef) {
    if (scope.nodeToRestore) return false;
    scope = scope.parent;
  }
  return scope?.scopeRef === scopeRef;
}
function $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain) {
  const nodeToRestoreRef = (0, import_react35.useRef)(typeof document !== "undefined" ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(
    // oxlint-disable-next-line react/react-compiler
    (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0)
  ) : null);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    let scope = scopeRef.current;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
    if (!restoreFocus || contain) return;
    let onFocus = () => {
      if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
    };
    ownerDocument.addEventListener("focusin", onFocus, false);
    scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
    return () => {
      ownerDocument.removeEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
    };
  }, [
    scopeRef,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let onKeyDown = (e) => {
      if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e.isComposing) return;
      let focusedElement = ownerDocument.activeElement;
      if (!$535772f9d2c1f38d$var$isElementInChildScope(focusedElement, scopeRef) || !$535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef)) return;
      let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode) return;
      let nodeToRestore = treeNode.nodeToRestore;
      let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(ownerDocument.body, {
        tabbable: true
      });
      walker.currentNode = focusedElement;
      let nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
      if (!nodeToRestore || !nodeToRestore.isConnected || nodeToRestore === ownerDocument.body) {
        nodeToRestore = void 0;
        treeNode.nodeToRestore = void 0;
      }
      if ((!nextElement || !$535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef)) && nodeToRestore) {
        walker.currentNode = nodeToRestore;
        do
          nextElement = e.shiftKey ? walker.previousNode() : walker.nextNode();
        while ($535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef));
        e.preventDefault();
        e.stopPropagation();
        if (nextElement) $535772f9d2c1f38d$var$focusElement(nextElement, true);
        else if (!$535772f9d2c1f38d$var$isElementInAnyScope(nodeToRestore)) focusedElement.blur();
        else $535772f9d2c1f38d$var$focusElement(nodeToRestore, true);
      }
    };
    if (!contain) ownerDocument.addEventListener("keydown", onKeyDown, true);
    return () => {
      if (!contain) ownerDocument.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    scopeRef,
    restoreFocus,
    contain
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
    if (!restoreFocus) return;
    let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
    if (!treeNode) return;
    treeNode.nodeToRestore = nodeToRestoreRef.current ?? void 0;
    return () => {
      let treeNode2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode2) return;
      let nodeToRestore = treeNode2.nodeToRestore;
      let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      if (restoreFocus && nodeToRestore && (activeElement && $535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef) || activeElement === ownerDocument.body && $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef))) {
        let clonedTree = $535772f9d2c1f38d$export$d06fae2ee68b101e.clone();
        requestAnimationFrame(() => {
          if (ownerDocument.activeElement === ownerDocument.body) {
            let treeNode3 = clonedTree.getTreeNode(scopeRef);
            while (treeNode3) {
              if (treeNode3.nodeToRestore && treeNode3.nodeToRestore.isConnected) {
                $535772f9d2c1f38d$var$restoreFocusToElement(treeNode3.nodeToRestore);
                return;
              }
              treeNode3 = treeNode3.parent;
            }
            treeNode3 = clonedTree.getTreeNode(scopeRef);
            while (treeNode3) {
              if (treeNode3.scopeRef && // TODO: this is probably a false positive based on naming, it's not a real ref, rename.
              // oxlint-disable-next-line react-hooks/exhaustive-deps
              treeNode3.scopeRef.current && $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(treeNode3.scopeRef)) {
                let node = $535772f9d2c1f38d$var$getFirstInScope(treeNode3.scopeRef.current, true);
                if (node) {
                  $535772f9d2c1f38d$var$restoreFocusToElement(node);
                  return;
                }
              }
              treeNode3 = treeNode3.parent;
            }
          }
        });
      }
    };
  }, [
    scopeRef,
    restoreFocus
  ]);
}
function $535772f9d2c1f38d$var$restoreFocusToElement(node) {
  if (node.dispatchEvent(new CustomEvent($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, {
    bubbles: true,
    cancelable: true
  }))) $535772f9d2c1f38d$var$focusElement(node);
}
function $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, opts, scope) {
  let filter = opts?.tabbable ? (0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d) : (0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed);
  let rootElement = root?.nodeType === Node.ELEMENT_NODE ? root : null;
  let doc = (0, $d447af545b77c9f1$export$b204af158042fbac)(rootElement);
  let walker = (0, $654b97e09f2a30c1$export$4d0f8be8b12a7ef6)(doc, root || doc, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(opts?.from, node)) return NodeFilter.FILTER_REJECT;
      if (opts?.tabbable && node.tagName === "INPUT" && node.getAttribute("type") === "radio") {
        if (!$535772f9d2c1f38d$var$isTabbableRadio(node)) return NodeFilter.FILTER_REJECT;
        if (walker.currentNode.tagName === "INPUT" && walker.currentNode.type === "radio" && walker.currentNode.name === node.name) return NodeFilter.FILTER_REJECT;
      }
      if (filter(node) && (!scope || $535772f9d2c1f38d$var$isElementInScope(node, scope)) && (!opts?.accept || opts.accept(node))) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    }
  });
  if (opts?.from) walker.currentNode = opts.from;
  return walker;
}
var $535772f9d2c1f38d$var$Tree = class _$535772f9d2c1f38d$var$Tree {
  constructor() {
    this.fastMap = /* @__PURE__ */ new Map();
    this.root = new $535772f9d2c1f38d$var$TreeNode({
      scopeRef: null
    });
    this.fastMap.set(null, this.root);
  }
  get size() {
    return this.fastMap.size;
  }
  getTreeNode(data) {
    return this.fastMap.get(data);
  }
  addTreeNode(scopeRef, parent, nodeToRestore) {
    let parentNode = this.fastMap.get(parent ?? null);
    if (!parentNode) return;
    let node = new $535772f9d2c1f38d$var$TreeNode({
      scopeRef
    });
    parentNode.addChild(node);
    node.parent = parentNode;
    this.fastMap.set(scopeRef, node);
    if (nodeToRestore) node.nodeToRestore = nodeToRestore;
  }
  addNode(node) {
    this.fastMap.set(node.scopeRef, node);
  }
  removeTreeNode(scopeRef) {
    if (scopeRef === null) return;
    let node = this.fastMap.get(scopeRef);
    if (!node) return;
    let parentNode = node.parent;
    for (let current of this.traverse()) if (current !== node && node.nodeToRestore && current.nodeToRestore && node.scopeRef && node.scopeRef.current && $535772f9d2c1f38d$var$isElementInScope(current.nodeToRestore, node.scopeRef.current)) current.nodeToRestore = node.nodeToRestore;
    let children = node.children;
    if (parentNode) {
      parentNode.removeChild(node);
      if (children.size > 0) children.forEach((child) => parentNode && parentNode.addChild(child));
    }
    this.fastMap.delete(node.scopeRef);
  }
  // Pre Order Depth First
  *traverse(node = this.root) {
    if (node.scopeRef != null) yield node;
    if (node.children.size > 0) for (let child of node.children) yield* this.traverse(child);
  }
  clone() {
    let newTree = new _$535772f9d2c1f38d$var$Tree();
    for (let node of this.traverse()) newTree.addTreeNode(node.scopeRef, node.parent?.scopeRef ?? null, node.nodeToRestore);
    return newTree;
  }
};
var $535772f9d2c1f38d$var$TreeNode = class {
  constructor(props) {
    this.children = /* @__PURE__ */ new Set();
    this.contain = false;
    this.scopeRef = props.scopeRef;
  }
  addChild(node) {
    this.children.add(node);
    node.parent = this;
  }
  removeChild(node) {
    this.children.delete(node);
    node.parent = void 0;
  }
};
var $535772f9d2c1f38d$export$d06fae2ee68b101e = new $535772f9d2c1f38d$var$Tree();

// node_modules/react-aria/dist/private/selection/utils.mjs
function $22bbea12c2567021$export$d3e3bd3e26688c04(e) {
  return (0, $2add3ce32c6007eb$export$e1865c3bedcd822b)() ? e.altKey : e.ctrlKey;
}
function $22bbea12c2567021$export$c3d8340acf92597f(collectionRef, key) {
  let selector = `[data-key="${CSS.escape(String(key))}"]`;
  let collection = collectionRef.current?.dataset.collection;
  if (collection) selector = `[data-collection="${CSS.escape(collection)}"]${selector}`;
  return collectionRef.current?.querySelector(selector);
}
var $22bbea12c2567021$var$collectionMap = /* @__PURE__ */ new WeakMap();
function $22bbea12c2567021$export$881eb0d9f3605d9d(collection) {
  let id = (0, $390e54f620492c70$export$f680877a34711e37)();
  $22bbea12c2567021$var$collectionMap.set(collection, id);
  return id;
}
function $22bbea12c2567021$export$6aeb1680a0ae8741(collection) {
  return $22bbea12c2567021$var$collectionMap.get(collection);
}

// node_modules/react-aria/dist/private/selection/useTypeSelect.mjs
var import_react36 = require("react");
var $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS = 1e3;
function $f5a4a9a3486154da$export$e32c88dfddc6e1d8(options) {
  let { keyboardDelegate, selectionManager, onTypeSelect } = options;
  let state = (0, import_react36.useRef)({
    search: "",
    timeout: void 0
  });
  let onKeyDownCapture = (e) => {
    if (state.current.search.length > 0 && e.key === " ") {
      e.preventDefault();
      if (!("continuePropagation" in e) || "continuePropagation" in e && !e.isPropagationStopped()) e.stopPropagation();
      state.current.search += " ";
      if (keyboardDelegate.getKeyForSearch != null) {
        let key = keyboardDelegate.getKeyForSearch(state.current.search, selectionManager.focusedKey);
        if (key == null) key = keyboardDelegate.getKeyForSearch(state.current.search);
        if (key != null) {
          selectionManager.setFocusedKey(key);
          if (onTypeSelect) onTypeSelect(key);
        }
      }
      clearTimeout(state.current.timeout);
      state.current.timeout = setTimeout(() => {
        state.current.search = "";
      }, $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS);
    }
  };
  let onKeyDown = (e) => {
    let character = $f5a4a9a3486154da$var$getStringForKey(e.key);
    if (!character || e.ctrlKey || e.metaKey || e.altKey || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e)) || state.current.search.length === 0 && character === " ") return;
    state.current.search += character;
    if (keyboardDelegate.getKeyForSearch != null) {
      let key = keyboardDelegate.getKeyForSearch(state.current.search, selectionManager.focusedKey);
      if (key == null) key = keyboardDelegate.getKeyForSearch(state.current.search);
      if (key != null) {
        selectionManager.setFocusedKey(key);
        if (onTypeSelect) onTypeSelect(key);
        e.preventDefault();
        if (!("continuePropagation" in e)) e.stopPropagation();
      } else {
        state.current.search = "";
        clearTimeout(state.current.timeout);
        state.current.timeout = void 0;
        return;
      }
    }
    clearTimeout(state.current.timeout);
    state.current.timeout = setTimeout(() => {
      state.current.search = "";
    }, $f5a4a9a3486154da$var$TYPEAHEAD_DEBOUNCE_WAIT_MS);
  };
  (0, import_react36.useEffect)(() => {
    let timeout = state.current.timeout;
    return () => {
      clearTimeout(timeout);
    };
  }, [
    state
  ]);
  return {
    typeSelectProps: {
      // Using a capturing listener to catch the keydown event before
      // other hooks in order to handle the Spacebar event.
      onKeyDownCapture: keyboardDelegate.getKeyForSearch ? onKeyDownCapture : void 0,
      onKeyDown: keyboardDelegate.getKeyForSearch ? onKeyDown : void 0
    }
  };
}
function $f5a4a9a3486154da$var$getStringForKey(key) {
  if (key.length === 1 || !/^[A-Z]/i.test(key)) return key;
  return "";
}

// node_modules/react-aria/dist/private/utils/useUpdateLayoutEffect.mjs
var import_react37 = require("react");
function $a475cdc2445827b5$export$72ef708ab07251f1(effect, dependencies) {
  const isInitialMount = (0, import_react37.useRef)(true);
  const lastDeps = (0, import_react37.useRef)(null);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    isInitialMount.current = true;
    return () => {
      isInitialMount.current = false;
    };
  }, []);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isInitialMount.current) isInitialMount.current = false;
    else if (!lastDeps.current || dependencies.some((dep, i) => !Object.is(dep, lastDeps[i]))) effect();
    lastDeps.current = dependencies;
  }, dependencies);
}

// node_modules/react-aria/dist/private/selection/useSelectableCollection.mjs
var import_react_dom4 = require("react-dom");
var import_react38 = require("react");
function $d667c2af82d35a98$export$d6daf82dcd84e87c(options) {
  let { selectionManager: manager, keyboardDelegate: delegate, ref, autoFocus = false, shouldFocusWrap = false, disallowEmptySelection = false, disallowSelectAll = false, escapeKeyBehavior = "clearSelection", selectOnFocus = manager.selectionBehavior === "replace", disallowTypeAhead = false, shouldUseVirtualFocus, allowsTabNavigation = false, scrollRef = ref, linkBehavior = "action", UNSTABLE_focusOnEntry } = options;
  let { direction } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let router = (0, $caaf0dd3060ed57c$export$9a302a45f65d0572)();
  const navigateToKey = (e, key, childFocus) => {
    if (key != null) {
      if (manager.isLink(key) && linkBehavior === "selection" && selectOnFocus && !(0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) {
        (0, import_react_dom4.flushSync)(() => {
          manager.setFocusedKey(key, childFocus);
        });
        let item = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, key);
        let itemProps = manager.getItemProps(key);
        if (item) {
          router.open(item, e, itemProps.href, itemProps.routerOptions);
          return;
        }
        return false;
      }
      manager.setFocusedKey(key, childFocus);
      if (manager.isLink(key) && linkBehavior === "override") return false;
      if (e.shiftKey && manager.selectionMode === "multiple") {
        manager.extendSelection(key);
        return;
      } else if (selectOnFocus && !(0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) {
        manager.replaceSelection(key);
        return;
      }
    }
    return false;
  };
  let arrowDown = (e) => {
    if (delegate.getKeyBelow) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyBelow?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = delegate.getFirstKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey);
        return;
      }
    }
    return false;
  };
  let arrowUp = (e) => {
    if (delegate.getKeyAbove) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyAbove?.(manager.focusedKey) : delegate.getLastKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = delegate.getLastKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey);
        return;
      }
    }
    return false;
  };
  let home = (e) => {
    if (delegate.getFirstKey) {
      if (manager.focusedKey === null && e.shiftKey) return false;
      let firstKey2 = delegate.getFirstKey(manager.focusedKey, (0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e));
      manager.setFocusedKey(firstKey2);
      if (firstKey2 != null) {
        if ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) && e.shiftKey && manager.selectionMode === "multiple") {
          manager.extendSelection(firstKey2);
          return;
        } else if (selectOnFocus) {
          manager.replaceSelection(firstKey2);
          return;
        }
      }
    }
    return false;
  };
  let arrowLeft = (e) => {
    if (delegate.getKeyLeftOf) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyLeftOf?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = direction === "rtl" ? delegate.getFirstKey?.(manager.focusedKey) : delegate.getLastKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey, direction === "rtl" ? "first" : "last");
        return;
      }
    }
    return false;
  };
  let arrowRight = (e) => {
    if (delegate.getKeyRightOf) {
      let nextKey = manager.focusedKey != null ? delegate.getKeyRightOf?.(manager.focusedKey) : delegate.getFirstKey?.();
      if (nextKey == null && shouldFocusWrap) nextKey = direction === "rtl" ? delegate.getLastKey?.(manager.focusedKey) : delegate.getFirstKey?.(manager.focusedKey);
      if (nextKey != null) {
        navigateToKey(e, nextKey, direction === "rtl" ? "last" : "first");
        return;
      }
    }
    return false;
  };
  let end = (e) => {
    if (delegate.getLastKey) {
      if (manager.focusedKey === null && e.shiftKey) return false;
      let lastKey = delegate.getLastKey(manager.focusedKey, (0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e));
      manager.setFocusedKey(lastKey);
      if (lastKey != null) {
        if ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) && e.shiftKey && manager.selectionMode === "multiple") {
          manager.extendSelection(lastKey);
          return;
        } else if (selectOnFocus) {
          manager.replaceSelection(lastKey);
          return;
        }
      }
    }
    return false;
  };
  let pageDown = (e) => {
    if (delegate.getKeyPageBelow && manager.focusedKey != null) {
      let nextKey = delegate.getKeyPageBelow(manager.focusedKey);
      if (nextKey != null) return navigateToKey(e, nextKey);
    }
    return false;
  };
  let pageUp = (e) => {
    if (delegate.getKeyPageAbove && manager.focusedKey != null) {
      let nextKey = delegate.getKeyPageAbove(manager.focusedKey);
      if (nextKey != null) return navigateToKey(e, nextKey);
    }
    return false;
  };
  let aHandler = () => {
    if (manager.selectionMode === "multiple" && disallowSelectAll !== true) {
      manager.selectAll();
      return;
    }
    return false;
  };
  let escape = () => {
    if (escapeKeyBehavior === "clearSelection" && !disallowEmptySelection && manager.selectedKeys.size !== 0) {
      manager.clearSelection();
      return;
    }
    return false;
  };
  let tab = () => {
    if (!allowsTabNavigation && ref.current) {
      let walker = (0, $535772f9d2c1f38d$export$2d6ec8fc375ceafa)(ref.current, {
        tabbable: true
      });
      let next = void 0;
      let last;
      do {
        last = walker.lastChild();
        if (last) next = last;
      } while (last);
      let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
      if (next && (!(0, $23f2114a1b82827e$export$b4f377a2b6254582)(next) || activeElement && !(0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d)(activeElement))) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(next);
    }
    return {
      shouldContinuePropagation: true,
      shouldPreventDefault: false
    };
  };
  let shiftTab = () => {
    if (!allowsTabNavigation && ref.current) ref.current.focus();
    return {
      shouldContinuePropagation: true,
      shouldPreventDefault: false
    };
  };
  let withShiftSel = (key, callback) => {
    return {
      [(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? key + "+Shift+Alt" : key + "+Shift+Control"]: callback,
      [key + "+Shift"]: callback,
      [(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? key + "+Alt" : key + "+Control"]: callback,
      [key]: callback
    };
  };
  let { keyboardProps: repeatKeyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)({
    shortcuts: {
      ...withShiftSel("ArrowDown", arrowDown),
      ...withShiftSel("ArrowUp", arrowUp),
      ...withShiftSel("ArrowLeft", arrowLeft),
      ...withShiftSel("ArrowRight", arrowRight),
      ...withShiftSel("PageDown", pageDown),
      ...withShiftSel("PageUp", pageUp)
    },
    allowRepeats: true
  });
  let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)({
    shortcuts: {
      ...withShiftSel("Home", home),
      ...withShiftSel("End", end),
      "Mod+A": aHandler,
      Escape: escape,
      Tab: tab,
      "Tab+Shift": shiftTab
    }
  });
  let scrollPos = (0, import_react38.useRef)({
    top: 0,
    left: 0
  });
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(scrollRef, "scroll", () => {
    scrollPos.current = {
      top: scrollRef.current?.scrollTop ?? 0,
      left: scrollRef.current?.scrollLeft ?? 0
    };
  });
  let onFocus = (e) => {
    if (manager.isFocused) {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) manager.setFocused(false);
      return;
    }
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
    let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
    manager.setFocused(true);
    let navigateToKey2 = (key) => {
      if (key != null) {
        manager.setFocusedKey(key);
        if (selectOnFocus && !manager.isSelected(key)) manager.replaceSelection(key);
      }
    };
    if (UNSTABLE_focusOnEntry && (modality === "keyboard" || modality === "virtual"))
      navigateToKey2(UNSTABLE_focusOnEntry === "first" ? delegate.getFirstKey?.() : delegate.getLastKey?.());
    else if (manager.focusedKey == null) {
      let relatedTarget = e.relatedTarget;
      if (relatedTarget && e.currentTarget.compareDocumentPosition(relatedTarget) & Node.DOCUMENT_POSITION_FOLLOWING) navigateToKey2(manager.lastSelectedKey ?? delegate.getLastKey?.());
      else navigateToKey2(manager.firstSelectedKey ?? delegate.getFirstKey?.());
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPos.current.top;
      scrollRef.current.scrollLeft = scrollPos.current.left;
    }
    if (manager.focusedKey != null && scrollRef.current) {
      let element = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, manager.focusedKey);
      if (element instanceof HTMLElement) {
        if (!(0, $23f2114a1b82827e$export$b4f377a2b6254582)(element) && !shouldUseVirtualFocus) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
        if (modality === "keyboard" || UNSTABLE_focusOnEntry && modality === "virtual") (0, $51a3e22a5186a962$export$c826860796309d1b)(element, {
          containingElement: ref.current
        });
      }
    }
  };
  let onBlur = (e) => {
    if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e.currentTarget, e.relatedTarget)) manager.setFocused(false);
  };
  let shouldVirtualFocusFirst = (0, import_react38.useRef)(false);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, (0, $8b2399d051d06d4c$export$831c820ad60f9d12), !shouldUseVirtualFocus ? void 0 : (e) => {
    let { detail } = e;
    e.stopPropagation();
    manager.setFocused(true);
    if (detail?.focusStrategy === "first") shouldVirtualFocusFirst.current = true;
  });
  let firstKey = delegate.getFirstKey?.() ?? null;
  (0, $a475cdc2445827b5$export$72ef708ab07251f1)(() => {
    if (shouldVirtualFocusFirst.current) {
      if (firstKey == null) {
        let previousActiveElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
        (0, $b72f3f7b3b5f42c6$export$76e4e37e5339496d)(ref.current);
        (0, $b72f3f7b3b5f42c6$export$2b35b76d2e30e129)(previousActiveElement, null);
        if (manager.collection.size > 0) shouldVirtualFocusFirst.current = false;
      } else {
        manager.setFocusedKey(firstKey);
        shouldVirtualFocusFirst.current = false;
      }
    }
  }, [
    firstKey,
    manager.collection.size
  ]);
  (0, $a475cdc2445827b5$export$72ef708ab07251f1)(() => {
    if (manager.collection.size > 0) shouldVirtualFocusFirst.current = false;
  }, [
    manager.focusedKey
  ]);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, (0, $8b2399d051d06d4c$export$447a38995de2c711), !shouldUseVirtualFocus ? void 0 : (e) => {
    e.stopPropagation();
    manager.setFocused(false);
    if (e.detail?.clearFocusKey) manager.setFocusedKey(null);
  });
  const autoFocusRef = (0, import_react38.useRef)(autoFocus);
  const didAutoFocusRef = (0, import_react38.useRef)(false);
  (0, import_react38.useEffect)(() => {
    if (autoFocusRef.current) {
      let focusedKey = null;
      if (autoFocus === "first") focusedKey = delegate.getFirstKey?.() ?? null;
      if (autoFocus === "last") focusedKey = delegate.getLastKey?.() ?? null;
      let selectedKeys = manager.selectedKeys;
      if (selectedKeys.size) {
        for (let key of selectedKeys) if (manager.canSelectItem(key)) {
          focusedKey = key;
          break;
        }
      }
      manager.setFocused(true);
      manager.setFocusedKey(focusedKey);
      if (focusedKey != null && selectOnFocus && !selectedKeys.size && manager.canSelectItem(focusedKey)) manager.replaceSelection(focusedKey);
      if (focusedKey == null && !shouldUseVirtualFocus && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
      if (manager.collection.size > 0) {
        autoFocusRef.current = false;
        didAutoFocusRef.current = true;
      }
    }
  });
  let lastFocusedKey = (0, import_react38.useRef)(manager.focusedKey);
  let raf = (0, import_react38.useRef)(null);
  (0, import_react38.useEffect)(() => {
    if (manager.isFocused && manager.focusedKey != null && (manager.focusedKey !== lastFocusedKey.current || didAutoFocusRef.current) && scrollRef.current && ref.current) {
      let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
      let element = (0, $22bbea12c2567021$export$c3d8340acf92597f)(ref, manager.focusedKey);
      if (!(element instanceof HTMLElement))
        return;
      if (modality === "keyboard" || didAutoFocusRef.current) {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
          if (scrollRef.current) {
            (0, $51a3e22a5186a962$export$53a0910f038337bd)(scrollRef.current, element);
            if (modality !== "virtual") (0, $51a3e22a5186a962$export$c826860796309d1b)(element, {
              containingElement: ref.current
            });
          }
        });
      }
    }
    if (!shouldUseVirtualFocus && manager.isFocused && manager.focusedKey == null && lastFocusedKey.current != null && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
    lastFocusedKey.current = manager.focusedKey;
    didAutoFocusRef.current = false;
  });
  (0, import_react38.useEffect)(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, "react-aria-focus-scope-restore", (e) => {
    e.preventDefault();
    manager.setFocused(true);
  });
  let handlers = {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(keyboardProps, repeatKeyboardProps),
    onFocus,
    onBlur,
    onMouseDown(e) {
      if (scrollRef.current === (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))
        e.preventDefault();
    }
  };
  let { typeSelectProps } = (0, $f5a4a9a3486154da$export$e32c88dfddc6e1d8)({
    keyboardDelegate: delegate,
    selectionManager: manager
  });
  if (!disallowTypeAhead)
    handlers = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(typeSelectProps, handlers);
  let tabIndex = void 0;
  if (!shouldUseVirtualFocus) tabIndex = manager.focusedKey == null ? 0 : -1;
  let collectionId = (0, $22bbea12c2567021$export$881eb0d9f3605d9d)(manager.collection);
  return {
    // oxlint-disable-next-line react/react-compiler
    collectionProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(handlers, {
      tabIndex,
      "data-collection": collectionId
    })
  };
}

// node_modules/react-aria/dist/private/interactions/useLongPress.mjs
var import_react39 = require("react");
var $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD = 500;
function $7b01448eaad0fe7c$export$c24ed0104d07eab9(props) {
  let { isDisabled, pointerType, onLongPressStart, onLongPressEnd, onLongPress, threshold = $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD, accessibilityDescription } = props;
  const timeRef = (0, import_react39.useRef)(void 0);
  let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
  let isAcceptedPointerType = (e) => pointerType ? e.pointerType === pointerType : e.pointerType === "mouse" || e.pointerType === "touch";
  let { pressProps } = (0, $d27d541f9569d26d$export$45712eceda6fad21)({
    isDisabled,
    onPressStart(e) {
      e.continuePropagation();
      if (isAcceptedPointerType(e)) {
        if (onLongPressStart) onLongPressStart({
          ...e,
          type: "longpressstart"
        });
        timeRef.current = setTimeout(() => {
          e.target.dispatchEvent(new PointerEvent("pointercancel", {
            bubbles: true
          }));
          addGlobalListener(e.target, "click", (e2) => e2.preventDefault(), {
            once: true
          });
          if ((0, $d447af545b77c9f1$export$b204af158042fbac)(e.target).activeElement !== e.target) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(e.target);
          if (onLongPress) onLongPress({
            ...e,
            type: "longpress"
          });
          timeRef.current = void 0;
        }, threshold);
        if (e.pointerType === "touch") addGlobalListener(e.target, "contextmenu", (e2) => e2.preventDefault(), {
          once: true
        });
        let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(e.target);
        addGlobalListener(ownerWindow, "pointerup", () => {
          setTimeout(() => {
            removeAllGlobalListeners();
          }, 100);
        }, {
          once: true
        });
      }
    },
    onPressEnd(e) {
      if (timeRef.current) clearTimeout(timeRef.current);
      if (onLongPressEnd && isAcceptedPointerType(e)) onLongPressEnd({
        ...e,
        type: "longpressend"
      });
    }
  });
  let descriptionProps = (0, $121970af65029459$export$f8aeda7b10753fa1)(onLongPress && !isDisabled ? accessibilityDescription : void 0);
  return {
    longPressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(pressProps, descriptionProps)
  };
}

// node_modules/react-aria/dist/private/selection/useSelectableItem.mjs
var import_react40 = require("react");
function $f6ba6936bfd098a0$export$ecf600387e221c37(options) {
  let { id, selectionManager: manager, key, ref, shouldSelectOnPressUp, shouldUseVirtualFocus, focus, isDisabled, onAction, allowsDifferentPressOrigin, linkBehavior = "action" } = options;
  let router = (0, $caaf0dd3060ed57c$export$9a302a45f65d0572)();
  id = (0, $390e54f620492c70$export$f680877a34711e37)(id);
  let onSelect = (e) => {
    if (e.pointerType === "keyboard" && (0, $22bbea12c2567021$export$d3e3bd3e26688c04)(e)) manager.toggleSelection(key);
    else {
      if (manager.selectionMode === "none") return;
      if (manager.isLink(key)) {
        if (linkBehavior === "selection" && ref.current) {
          let itemProps2 = manager.getItemProps(key);
          router.open(ref.current, e, itemProps2.href, itemProps2.routerOptions);
          manager.setSelectedKeys(manager.selectedKeys);
          return;
        } else if (linkBehavior === "override" || linkBehavior === "none") return;
      }
      if (manager.selectionMode === "single") {
        if (manager.isSelected(key) && !manager.disallowEmptySelection) manager.toggleSelection(key);
        else manager.replaceSelection(key);
      } else if (e && e.shiftKey) manager.extendSelection(key);
      else if (manager.selectionBehavior === "toggle" || e && ((0, $bb39c0fc1c19b34c$export$16792effe837dba3)(e) || e.pointerType === "touch" || e.pointerType === "virtual"))
        manager.toggleSelection(key);
      else manager.replaceSelection(key);
    }
  };
  (0, import_react40.useEffect)(() => {
    let isFocused = key === manager.focusedKey;
    if (isFocused && manager.isFocused) {
      if (!shouldUseVirtualFocus) {
        if (focus) focus();
        else if ((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() !== ref.current && ref.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
      } else (0, $b72f3f7b3b5f42c6$export$76e4e37e5339496d)(ref.current);
    }
  }, [
    ref,
    key,
    manager.focusedKey,
    manager.childFocusStrategy,
    manager.isFocused,
    shouldUseVirtualFocus
  ]);
  isDisabled = isDisabled || manager.isDisabled(key);
  let itemProps = {};
  if (!shouldUseVirtualFocus && !isDisabled) itemProps = {
    tabIndex: key === manager.focusedKey ? 0 : -1,
    onFocus(e) {
      if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e) === ref.current) manager.setFocusedKey(key);
    }
  };
  else if (isDisabled) itemProps.onMouseDown = (e) => {
    e.preventDefault();
  };
  (0, import_react40.useEffect)(() => {
    if (isDisabled && manager.focusedKey === key) manager.setFocusedKey(null);
  }, [
    manager,
    isDisabled,
    key
  ]);
  let isLinkOverride = manager.isLink(key) && linkBehavior === "override";
  let isActionOverride = onAction && options["UNSTABLE_itemBehavior"] === "action";
  let hasLinkAction = manager.isLink(key) && linkBehavior !== "selection" && linkBehavior !== "none";
  let allowsSelection = !isDisabled && manager.canSelectItem(key) && !isLinkOverride && !isActionOverride;
  let allowsActions = (onAction || hasLinkAction) && !isDisabled;
  let hasPrimaryAction = allowsActions && (manager.selectionBehavior === "replace" ? !allowsSelection : !allowsSelection || manager.isEmpty);
  let hasSecondaryAction = allowsActions && allowsSelection && manager.selectionBehavior === "replace";
  let hasAction = hasPrimaryAction || hasSecondaryAction;
  let modality = (0, import_react40.useRef)(null);
  let longPressEnabled = hasAction && allowsSelection;
  let longPressEnabledOnPressStart = (0, import_react40.useRef)(false);
  let hadPrimaryActionOnPressStart = (0, import_react40.useRef)(false);
  let collectionItemProps = manager.getItemProps(key);
  let performAction = (e) => {
    if (onAction) {
      onAction();
      ref.current?.dispatchEvent(new CustomEvent("react-aria-item-action", {
        bubbles: true
      }));
    }
    if (hasLinkAction && ref.current) router.open(ref.current, e, collectionItemProps.href, collectionItemProps.routerOptions);
  };
  let itemPressProps = {
    ref
  };
  if (shouldSelectOnPressUp) {
    itemPressProps.onPressStart = (e) => {
      modality.current = e.pointerType;
      longPressEnabledOnPressStart.current = longPressEnabled;
      if (e.pointerType === "keyboard" && (!hasAction || $f6ba6936bfd098a0$var$isSelectionKey(e.key))) onSelect(e);
    };
    if (!allowsDifferentPressOrigin)
      itemPressProps.onPress = (e) => {
        if (hasPrimaryAction || hasSecondaryAction && e.pointerType !== "mouse") {
          if (e.pointerType === "keyboard" && !$f6ba6936bfd098a0$var$isActionKey(e.key)) return;
          performAction(e);
        } else if (e.pointerType !== "keyboard" && allowsSelection) onSelect(e);
      };
    else {
      itemPressProps.onPressUp = hasPrimaryAction ? void 0 : (e) => {
        if (e.pointerType === "mouse" && allowsSelection) onSelect(e);
      };
      itemPressProps.onPress = hasPrimaryAction ? performAction : (e) => {
        if (e.pointerType !== "keyboard" && e.pointerType !== "mouse" && allowsSelection) onSelect(e);
      };
    }
  } else {
    itemPressProps.onPressStart = (e) => {
      modality.current = e.pointerType;
      longPressEnabledOnPressStart.current = longPressEnabled;
      hadPrimaryActionOnPressStart.current = hasPrimaryAction;
      if (allowsSelection && (e.pointerType === "mouse" && !hasPrimaryAction || e.pointerType === "keyboard" && (!allowsActions || $f6ba6936bfd098a0$var$isSelectionKey(e.key)))) onSelect(e);
    };
    itemPressProps.onPress = (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "virtual" || e.pointerType === "keyboard" && hasAction && $f6ba6936bfd098a0$var$isActionKey(e.key) || e.pointerType === "mouse" && hadPrimaryActionOnPressStart.current) {
        if (hasAction) performAction(e);
        else if (allowsSelection) onSelect(e);
      }
    };
  }
  let collectionId = (0, $22bbea12c2567021$export$6aeb1680a0ae8741)(manager.collection);
  itemProps["data-collection"] = collectionId;
  itemProps["data-key"] = key;
  itemPressProps.preventFocusOnPress = shouldUseVirtualFocus;
  if (shouldUseVirtualFocus)
    itemPressProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(itemPressProps, {
      onPressStart(e) {
        if (e.pointerType !== "touch") {
          manager.setFocused(true);
          manager.setFocusedKey(key);
        }
      },
      onPress(e) {
        if (e.pointerType === "touch") {
          manager.setFocused(true);
          manager.setFocusedKey(key);
        }
      }
    });
  if (collectionItemProps) {
    for (let key2 of [
      "onPressStart",
      "onPressEnd",
      "onPressChange",
      "onPress",
      "onPressUp",
      "onClick"
    ]) if (collectionItemProps[key2])
      itemPressProps[key2] = (0, $a4e76a5424781910$export$e08e3b67e392101e)(itemPressProps[key2], collectionItemProps[key2]);
  }
  let { pressProps, isPressed } = (0, $d27d541f9569d26d$export$45712eceda6fad21)(itemPressProps);
  let onDoubleClick = hasSecondaryAction ? (e) => {
    if (modality.current === "mouse") {
      e.stopPropagation();
      e.preventDefault();
      performAction(e);
    }
  } : void 0;
  let { longPressProps } = (0, $7b01448eaad0fe7c$export$c24ed0104d07eab9)({
    isDisabled: !longPressEnabled,
    onLongPress(e) {
      if (e.pointerType === "touch") {
        onSelect(e);
        manager.setSelectionBehavior("toggle");
      }
    }
  });
  let onDragStartCapture = (e) => {
    if (modality.current === "touch" && longPressEnabledOnPressStart.current) e.preventDefault();
  };
  let onClick = linkBehavior !== "none" && manager.isLink(key) ? (e) => {
    if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening) e.preventDefault();
  } : void 0;
  let mergedItemProps = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(
    // oxlint-disable-next-line react/react-compiler
    itemProps,
    allowsSelection || hasPrimaryAction || shouldUseVirtualFocus && !isDisabled ? pressProps : {},
    longPressEnabled ? longPressProps : {},
    // oxlint-disable-next-line react/react-compiler
    {
      onDoubleClick,
      onDragStartCapture,
      onClick,
      id
    },
    // Prevent DOM focus from moving on mouse down when using virtual focus
    shouldUseVirtualFocus ? {
      onMouseDown: (e) => e.preventDefault()
    } : void 0
  );
  let isChildInteraction = (target) => {
    let el = target;
    while (el && el !== ref.current) {
      let elCollection = el.getAttribute("data-collection");
      if (elCollection != null) return elCollection !== collectionId;
      el = el.parentElement;
    }
    return (0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d)(target);
  };
  let baseOnPointerDown = mergedItemProps.onPointerDown;
  mergedItemProps.onPointerDown = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (target && target !== ref.current && isChildInteraction(target)) {
      e.stopPropagation();
      return;
    }
    baseOnPointerDown?.(e);
  };
  let baseOnMouseDown = mergedItemProps.onMouseDown;
  mergedItemProps.onMouseDown = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    if (target && target !== ref.current && isChildInteraction(target)) {
      e.stopPropagation();
      return;
    }
    baseOnMouseDown?.(e);
  };
  return {
    itemProps: mergedItemProps,
    isPressed,
    isSelected: manager.isSelected(key),
    isFocused: manager.isFocused && manager.focusedKey === key,
    isDisabled,
    allowsSelection,
    hasAction
  };
}
function $f6ba6936bfd098a0$var$isActionKey(key) {
  return key === "Enter";
}
function $f6ba6936bfd098a0$var$isSelectionKey(key) {
  return key === " ";
}

// node_modules/react-stately/dist/private/collections/getChildNodes.mjs
function $cd5ea4b915021f1d$export$1005530eda016c13(node, collection) {
  if (typeof collection.getChildren === "function") return collection.getChildren(node.key);
  return node.childNodes;
}
function $cd5ea4b915021f1d$export$fbdeaa6a76694f71(iterable) {
  return $cd5ea4b915021f1d$export$5f3398f8733f90e2(iterable, 0);
}
function $cd5ea4b915021f1d$export$5f3398f8733f90e2(iterable, index) {
  if (index < 0) return void 0;
  let i = 0;
  for (let item of iterable) {
    if (i === index) return item;
    i++;
  }
}
function $cd5ea4b915021f1d$export$8c434b3a7a4dad6(collection, a, b) {
  if (a.parentKey === b.parentKey) return a.index - b.index;
  let aAncestors = [
    ...$cd5ea4b915021f1d$var$getAncestors(collection, a),
    a
  ];
  let bAncestors = [
    ...$cd5ea4b915021f1d$var$getAncestors(collection, b),
    b
  ];
  let firstNonMatchingAncestor = aAncestors.slice(0, bAncestors.length).findIndex((a2, i) => a2 !== bAncestors[i]);
  if (firstNonMatchingAncestor !== -1) {
    a = aAncestors[firstNonMatchingAncestor];
    b = bAncestors[firstNonMatchingAncestor];
    return a.index - b.index;
  }
  if (aAncestors.findIndex((node) => node === b) >= 0) return 1;
  else if (bAncestors.findIndex((node) => node === a) >= 0) return -1;
  return -1;
}
function $cd5ea4b915021f1d$var$getAncestors(collection, node) {
  let parents = [];
  let currNode = node;
  while (currNode?.parentKey != null) {
    currNode = collection.getItem(currNode.parentKey);
    if (currNode) parents.unshift(currNode);
  }
  return parents;
}

// node_modules/react-stately/dist/private/list/ListCollection.mjs
var $f664a81d022446b5$export$d085fb9e920b5ca7 = class {
  constructor(nodes) {
    this.keyMap = /* @__PURE__ */ new Map();
    this.firstKey = null;
    this.lastKey = null;
    this.iterable = nodes;
    let visit = (node) => {
      this.keyMap.set(node.key, node);
      if (node.childNodes && node.type === "section") for (let child of node.childNodes) visit(child);
    };
    for (let node of nodes) visit(node);
    let last = null;
    let index = 0;
    let size = 0;
    for (let [key, node] of this.keyMap) {
      if (last) {
        last.nextKey = key;
        node.prevKey = last.key;
      } else {
        this.firstKey = key;
        node.prevKey = void 0;
      }
      if (node.type === "item") node.index = index++;
      if (node.type === "section" || node.type === "item") size++;
      last = node;
      last.nextKey = void 0;
    }
    this._size = size;
    this.lastKey = last?.key ?? null;
  }
  *[Symbol.iterator]() {
    yield* this.iterable;
  }
  get size() {
    return this._size;
  }
  getKeys() {
    return this.keyMap.keys();
  }
  getKeyBefore(key) {
    let node = this.keyMap.get(key);
    return node ? node.prevKey ?? null : null;
  }
  getKeyAfter(key) {
    let node = this.keyMap.get(key);
    return node ? node.nextKey ?? null : null;
  }
  getFirstKey() {
    return this.firstKey;
  }
  getLastKey() {
    return this.lastKey;
  }
  getItem(key) {
    return this.keyMap.get(key) ?? null;
  }
  at(idx) {
    const keys = [
      ...this.getKeys()
    ];
    return this.getItem(keys[idx]);
  }
  getChildren(key) {
    let node = this.keyMap.get(key);
    return node?.childNodes || [];
  }
};

// node_modules/react-stately/dist/private/selection/Selection.mjs
var $8b2540e09867b15e$export$52baac22726c72bf = class _$8b2540e09867b15e$export$52baac22726c72bf extends Set {
  constructor(keys, anchorKey, currentKey) {
    super(keys);
    if (keys instanceof _$8b2540e09867b15e$export$52baac22726c72bf) {
      this.anchorKey = anchorKey ?? keys.anchorKey;
      this.currentKey = currentKey ?? keys.currentKey;
    } else {
      this.anchorKey = anchorKey ?? null;
      this.currentKey = currentKey ?? null;
    }
  }
};

// node_modules/react-stately/dist/private/selection/useMultipleSelectionState.mjs
var import_react41 = require("react");
function $60f19cefd567a3e4$var$equalSets(setA, setB) {
  if (setA.size !== setB.size) return false;
  for (let item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}
function $60f19cefd567a3e4$export$253fe78d46329472(props) {
  let { selectionMode = "none", disallowEmptySelection = false, allowDuplicateSelectionEvents, selectionBehavior: selectionBehaviorProp = "toggle", disabledBehavior = "all" } = props;
  let isFocusedRef = (0, import_react41.useRef)(false);
  let [, setFocused] = (0, import_react41.useState)(false);
  let focusedKeyRef = (0, import_react41.useRef)(null);
  let childFocusStrategyRef = (0, import_react41.useRef)(null);
  let [, setFocusedKey] = (0, import_react41.useState)(null);
  let selectedKeysProp = (0, import_react41.useMemo)(() => $60f19cefd567a3e4$var$convertSelection(props.selectedKeys), [
    props.selectedKeys
  ]);
  let defaultSelectedKeys = (0, import_react41.useMemo)(() => $60f19cefd567a3e4$var$convertSelection(props.defaultSelectedKeys, new (0, $8b2540e09867b15e$export$52baac22726c72bf)()), [
    props.defaultSelectedKeys
  ]);
  let [selectedKeys, setSelectedKeys] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(selectedKeysProp, defaultSelectedKeys, props.onSelectionChange);
  let disabledKeysProp = (0, import_react41.useMemo)(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]);
  let [selectionBehavior, setSelectionBehavior] = (0, import_react41.useState)(selectionBehaviorProp);
  if (selectionBehaviorProp === "replace" && selectionBehavior === "toggle" && typeof selectedKeys === "object" && selectedKeys.size === 0) setSelectionBehavior("replace");
  let lastSelectionBehavior = (0, import_react41.useRef)(selectionBehaviorProp);
  (0, import_react41.useEffect)(() => {
    if (selectionBehaviorProp !== lastSelectionBehavior.current) {
      setSelectionBehavior(selectionBehaviorProp);
      lastSelectionBehavior.current = selectionBehaviorProp;
    }
  }, [
    selectionBehaviorProp
  ]);
  return {
    selectionMode,
    disallowEmptySelection,
    selectionBehavior,
    setSelectionBehavior,
    get isFocused() {
      return isFocusedRef.current;
    },
    setFocused(f) {
      isFocusedRef.current = f;
      setFocused(f);
    },
    get focusedKey() {
      return focusedKeyRef.current;
    },
    get childFocusStrategy() {
      return childFocusStrategyRef.current;
    },
    setFocusedKey(k, childFocusStrategy = "first") {
      focusedKeyRef.current = k;
      childFocusStrategyRef.current = childFocusStrategy;
      setFocusedKey(k);
    },
    selectedKeys,
    setSelectedKeys(keys) {
      if (allowDuplicateSelectionEvents || !$60f19cefd567a3e4$var$equalSets(keys, selectedKeys)) setSelectedKeys(keys);
    },
    disabledKeys: disabledKeysProp,
    disabledBehavior
  };
}
function $60f19cefd567a3e4$var$convertSelection(selection, defaultValue) {
  if (!selection) return defaultValue;
  return selection === "all" ? "all" : new (0, $8b2540e09867b15e$export$52baac22726c72bf)(selection);
}

// node_modules/react-stately/dist/private/selection/SelectionManager.mjs
var $4a07ac835f260f78$export$6c8a5aaad13c9852 = class _$4a07ac835f260f78$export$6c8a5aaad13c9852 {
  constructor(collection, state, options) {
    this.collection = collection;
    this.state = state;
    this.allowsCellSelection = options?.allowsCellSelection ?? false;
    this._isSelectAll = null;
    this.layoutDelegate = options?.layoutDelegate || null;
    this.fullCollection = options?.fullCollection || null;
  }
  /**
  * The type of selection that is allowed in the collection.
  */
  get selectionMode() {
    return this.state.selectionMode;
  }
  /**
  * Whether the collection allows empty selection.
  */
  get disallowEmptySelection() {
    return this.state.disallowEmptySelection;
  }
  /**
  * The selection behavior for the collection.
  */
  get selectionBehavior() {
    return this.state.selectionBehavior;
  }
  /**
  * Sets the selection behavior for the collection.
  */
  setSelectionBehavior(selectionBehavior) {
    this.state.setSelectionBehavior(selectionBehavior);
  }
  /**
  * Whether the collection is currently focused.
  */
  get isFocused() {
    return this.state.isFocused;
  }
  /**
  * Sets whether the collection is focused.
  */
  setFocused(isFocused) {
    this.state.setFocused(isFocused);
  }
  /**
  * The current focused key in the collection.
  */
  get focusedKey() {
    return this.state.focusedKey;
  }
  /** Whether the first or last child of the focused key should receive focus. */
  get childFocusStrategy() {
    return this.state.childFocusStrategy;
  }
  /**
  * Sets the focused key.
  */
  setFocusedKey(key, childFocusStrategy) {
    if (key == null || this.collection.getItem(key)) this.state.setFocusedKey(key, childFocusStrategy);
  }
  /**
  * The currently selected keys in the collection.
  */
  get selectedKeys() {
    return this.state.selectedKeys === "all" ? new Set(this.getSelectAllKeys()) : this.state.selectedKeys;
  }
  /**
  * The raw selection value for the collection.
  * Either 'all' for select all, or a set of keys.
  */
  get rawSelection() {
    return this.state.selectedKeys;
  }
  /**
  * Returns whether a key is selected.
  */
  isSelected(key) {
    if (this.state.selectionMode === "none") return false;
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return false;
    return this.state.selectedKeys === "all" ? this.canSelectItem(mappedKey) : this.state.selectedKeys.has(mappedKey);
  }
  /**
  * Whether the selection is empty.
  */
  get isEmpty() {
    return this.state.selectedKeys !== "all" && this.state.selectedKeys.size === 0;
  }
  /**
  * Whether all items in the collection are selected.
  */
  get isSelectAll() {
    if (this.isEmpty) return false;
    if (this.state.selectedKeys === "all") return true;
    if (this._isSelectAll != null) return this._isSelectAll;
    let allKeys = this.getSelectAllKeys();
    let selectedKeys = this.state.selectedKeys;
    this._isSelectAll = allKeys.every((k) => selectedKeys.has(k));
    return this._isSelectAll;
  }
  get firstSelectedKey() {
    let first = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      if (!first || item && (0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, item, first) < 0) first = item;
    }
    return first?.key ?? null;
  }
  get lastSelectedKey() {
    let last = null;
    for (let key of this.state.selectedKeys) {
      let item = this.collection.getItem(key);
      if (!last || item && (0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, item, last) > 0) last = item;
    }
    return last?.key ?? null;
  }
  get disabledKeys() {
    return this.state.disabledKeys;
  }
  get disabledBehavior() {
    return this.state.disabledBehavior;
  }
  /**
  * Extends the selection to the given key.
  */
  extendSelection(toKey) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single") {
      this.replaceSelection(toKey);
      return;
    }
    let mappedToKey = this.getKey(toKey);
    if (mappedToKey == null) return;
    let selection;
    if (this.state.selectedKeys === "all") selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)([
      mappedToKey
    ], mappedToKey, mappedToKey);
    else {
      let selectedKeys = this.state.selectedKeys;
      let anchorKey = selectedKeys.anchorKey ?? mappedToKey;
      selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)(selectedKeys, anchorKey, mappedToKey);
      for (let key of this.getKeyRange(anchorKey, selectedKeys.currentKey ?? mappedToKey)) selection.delete(key);
      for (let key of this.getKeyRange(mappedToKey, anchorKey)) if (this.canSelectItem(key)) selection.add(key);
    }
    this.state.setSelectedKeys(selection);
  }
  getKeyRange(from, to) {
    let fromItem = this.collection.getItem(from);
    let toItem = this.collection.getItem(to);
    if (fromItem && toItem) {
      if ((0, $cd5ea4b915021f1d$export$8c434b3a7a4dad6)(this.collection, fromItem, toItem) <= 0) return this.getKeyRangeInternal(from, to);
      return this.getKeyRangeInternal(to, from);
    }
    return [];
  }
  getKeyRangeInternal(from, to) {
    if (this.layoutDelegate?.getKeyRange) return this.layoutDelegate.getKeyRange(from, to);
    let keys = [];
    let key = from;
    while (key != null) {
      let item = this.collection.getItem(key);
      if (item && (item.type === "item" || item.type === "cell" && this.allowsCellSelection)) keys.push(key);
      if (key === to) return keys;
      key = this.collection.getKeyAfter(key);
    }
    return [];
  }
  getKey(key) {
    let item = this.collection.getItem(key);
    if (!item)
      return key;
    if (item.type === "cell" && this.allowsCellSelection) return key;
    while (item && item.type !== "item" && item.parentKey != null) item = this.collection.getItem(item.parentKey);
    if (!item || item.type !== "item") return null;
    return item.key;
  }
  /**
  * Toggles whether the given key is selected.
  */
  toggleSelection(key) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single" && !this.isSelected(key)) {
      this.replaceSelection(key);
      return;
    }
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let keys = new (0, $8b2540e09867b15e$export$52baac22726c72bf)(this.state.selectedKeys === "all" ? this.getSelectAllKeys() : this.state.selectedKeys);
    if (keys.has(mappedKey)) keys.delete(mappedKey);
    else if (this.canSelectItem(mappedKey)) {
      keys.add(mappedKey);
      keys.anchorKey = mappedKey;
      keys.currentKey = mappedKey;
    }
    if (this.disallowEmptySelection && keys.size === 0) return;
    this.state.setSelectedKeys(keys);
  }
  /**
  * Replaces the selection with only the given key.
  */
  replaceSelection(key) {
    if (this.selectionMode === "none") return;
    let mappedKey = this.getKey(key);
    if (mappedKey == null) return;
    let selection = this.canSelectItem(mappedKey) ? new (0, $8b2540e09867b15e$export$52baac22726c72bf)([
      mappedKey
    ], mappedKey, mappedKey) : new (0, $8b2540e09867b15e$export$52baac22726c72bf)();
    this.state.setSelectedKeys(selection);
  }
  /**
  * Replaces the selection with the given keys.
  */
  setSelectedKeys(keys) {
    if (this.selectionMode === "none") return;
    let selection = new (0, $8b2540e09867b15e$export$52baac22726c72bf)();
    for (let key of keys) {
      let mappedKey = this.getKey(key);
      if (mappedKey != null) {
        selection.add(mappedKey);
        if (this.selectionMode === "single") break;
      }
    }
    this.state.setSelectedKeys(selection);
  }
  getSelectAllKeys() {
    let collection = this.fullCollection ?? this.collection;
    let keys = [];
    let addKeys = (key) => {
      while (key != null) {
        if (this.canSelectItemIn(key, collection)) {
          let item = collection.getItem(key);
          if (item?.type === "item") keys.push(key);
          if (item?.hasChildNodes && (this.allowsCellSelection || item.type !== "item")) addKeys((0, $cd5ea4b915021f1d$export$fbdeaa6a76694f71)((0, $cd5ea4b915021f1d$export$1005530eda016c13)(item, collection))?.key ?? null);
        }
        key = collection.getKeyAfter(key);
      }
    };
    addKeys(collection.getFirstKey());
    return keys;
  }
  /**
  * Selects all items in the collection.
  */
  selectAll() {
    if (!this.isSelectAll && this.selectionMode === "multiple") this.state.setSelectedKeys("all");
  }
  /**
  * Removes all keys from the selection.
  */
  clearSelection() {
    if (!this.disallowEmptySelection && (this.state.selectedKeys === "all" || this.state.selectedKeys.size > 0)) this.state.setSelectedKeys(new (0, $8b2540e09867b15e$export$52baac22726c72bf)());
  }
  /**
  * Toggles between select all and an empty selection.
  */
  toggleSelectAll() {
    if (this.isSelectAll) this.clearSelection();
    else this.selectAll();
  }
  select(key, e) {
    if (this.selectionMode === "none") return;
    if (this.selectionMode === "single") {
      if (this.isSelected(key) && !this.disallowEmptySelection) this.toggleSelection(key);
      else this.replaceSelection(key);
    } else if (this.selectionBehavior === "toggle" || e && (e.pointerType === "touch" || e.pointerType === "virtual"))
      this.toggleSelection(key);
    else this.replaceSelection(key);
  }
  /**
  * Returns whether the current selection is equal to the given selection.
  */
  isSelectionEqual(selection) {
    if (selection === this.state.selectedKeys) return true;
    let selectedKeys = this.selectedKeys;
    if (selection.size !== selectedKeys.size) return false;
    for (let key of selection) {
      if (!selectedKeys.has(key)) return false;
    }
    for (let key of selectedKeys) {
      if (!selection.has(key)) return false;
    }
    return true;
  }
  canSelectItem(key) {
    return this.canSelectItemIn(key, this.collection);
  }
  canSelectItemIn(key, collection) {
    if (this.state.selectionMode === "none" || this.state.disabledKeys.has(key)) return false;
    let item = collection.getItem(key);
    if (!item || item?.props?.isDisabled || item.type === "cell" && !this.allowsCellSelection) return false;
    return true;
  }
  isDisabled(key) {
    let item = this.collection.getItem(key);
    return this.state.disabledBehavior === "all" && (this.state.disabledKeys.has(key) || !!item?.props?.isDisabled) && item?.props?.disabledBehavior !== "selection";
  }
  isLink(key) {
    return !!this.collection.getItem(key)?.props?.href;
  }
  getItemProps(key) {
    return this.collection.getItem(key)?.props;
  }
  withCollection(collection) {
    return new _$4a07ac835f260f78$export$6c8a5aaad13c9852(collection, this.state, {
      allowsCellSelection: this.allowsCellSelection,
      layoutDelegate: this.layoutDelegate || void 0,
      fullCollection: this.fullCollection ?? this.collection
    });
  }
};

// node_modules/react-stately/dist/private/collections/CollectionBuilder.mjs
var import_react42 = __toESM(require("react"), 1);
var $bda7a7e55e1ff206$export$bf788dd355e3a401 = class {
  build(props, context) {
    this.context = context;
    return $bda7a7e55e1ff206$var$iterable(() => this.iterateCollection(props));
  }
  *iterateCollection(props) {
    let { children, items } = props;
    if ((0, import_react42.default).isValidElement(children) && children.type === (0, import_react42.default).Fragment) yield* this.iterateCollection({
      children: children.props.children,
      items
    });
    else if (typeof children === "function") {
      if (!items) throw new Error("props.children was a function but props.items is missing");
      let index = 0;
      for (let item of items) {
        yield* this.getFullNode({
          value: item,
          index
        }, {
          renderer: children
        });
        index++;
      }
    } else {
      let items2 = [];
      (0, import_react42.default).Children.forEach(children, (child) => {
        if (child) items2.push(child);
      });
      let index = 0;
      for (let item of items2) {
        let nodes = this.getFullNode({
          element: item,
          index
        }, {});
        for (let node of nodes) {
          index++;
          yield node;
        }
      }
    }
  }
  getKey(item, partialNode, state, parentKey) {
    if (item.key != null) return item.key;
    if (partialNode.type === "cell" && partialNode.key != null) return `${parentKey}${partialNode.key}`;
    let v = partialNode.value;
    if (v != null) {
      let key = v.key ?? v.id;
      if (key == null) throw new Error("No key found for item");
      return key;
    }
    return parentKey ? `${parentKey}.${partialNode.index}` : `$.${partialNode.index}`;
  }
  getChildState(state, partialNode) {
    return {
      renderer: partialNode.renderer || state.renderer
    };
  }
  *getFullNode(partialNode, state, parentKey, parentNode) {
    if ((0, import_react42.default).isValidElement(partialNode.element) && partialNode.element.type === (0, import_react42.default).Fragment) {
      let children = [];
      (0, import_react42.default).Children.forEach(partialNode.element.props.children, (child) => {
        children.push(child);
      });
      let index = partialNode.index ?? 0;
      for (const child of children) yield* this.getFullNode({
        element: child,
        index: index++
      }, state, parentKey, parentNode);
      return;
    }
    let element = partialNode.element;
    if (!element && partialNode.value && state && state.renderer) {
      let cached = this.cache.get(partialNode.value);
      if (cached && (!cached.shouldInvalidate || !cached.shouldInvalidate(this.context))) {
        cached.index = partialNode.index;
        cached.parentKey = parentNode ? parentNode.key : null;
        yield cached;
        return;
      }
      element = state.renderer(partialNode.value);
    }
    if ((0, import_react42.default).isValidElement(element)) {
      let type = element.type;
      if (typeof type !== "function" && typeof type.getCollectionNode !== "function") {
        let name2 = element.type;
        throw new Error(`Unknown element <${name2}> in collection.`);
      }
      let childNodes = type.getCollectionNode(element.props, this.context);
      let index = partialNode.index ?? 0;
      let result = childNodes.next();
      while (!result.done && result.value) {
        let childNode = result.value;
        partialNode.index = index;
        let nodeKey = childNode.key ?? null;
        if (nodeKey == null) nodeKey = childNode.element ? null : this.getKey(element, partialNode, state, parentKey);
        let nodes = this.getFullNode({
          ...childNode,
          key: nodeKey,
          index,
          wrapper: $bda7a7e55e1ff206$var$compose(partialNode.wrapper, childNode.wrapper)
        }, this.getChildState(state, childNode), parentKey ? `${parentKey}${element.key}` : element.key, parentNode);
        let children = [
          ...nodes
        ];
        for (let node2 of children) {
          node2.value = childNode.value ?? partialNode.value ?? null;
          if (node2.value) this.cache.set(node2.value, node2);
          if (partialNode.type && node2.type !== partialNode.type) throw new Error(`Unsupported type <${$bda7a7e55e1ff206$var$capitalize(node2.type)}> in <${$bda7a7e55e1ff206$var$capitalize(parentNode?.type ?? "unknown parent type")}>. Only <${$bda7a7e55e1ff206$var$capitalize(partialNode.type)}> is supported.`);
          index++;
          yield node2;
        }
        result = childNodes.next(children);
      }
      return;
    }
    if (partialNode.key == null || partialNode.type == null) return;
    let builder = this;
    let node = {
      type: partialNode.type,
      props: partialNode.props,
      key: partialNode.key,
      parentKey: parentNode ? parentNode.key : null,
      value: partialNode.value ?? null,
      level: (parentNode?.level ?? 0) + (parentNode?.type === "item" ? 1 : 0),
      index: partialNode.index,
      rendered: partialNode.rendered,
      textValue: partialNode.textValue ?? "",
      "aria-label": partialNode["aria-label"],
      wrapper: partialNode.wrapper,
      shouldInvalidate: partialNode.shouldInvalidate,
      hasChildNodes: partialNode.hasChildNodes || false,
      childNodes: $bda7a7e55e1ff206$var$iterable(function* () {
        if (!partialNode.hasChildNodes || !partialNode.childNodes) return;
        let index = 0;
        for (let child of partialNode.childNodes()) {
          if (child.key != null)
            child.key = `${node.key}${child.key}`;
          let nodes = builder.getFullNode({
            ...child,
            index
          }, builder.getChildState(state, child), node.key, node);
          for (let node2 of nodes) {
            index++;
            yield node2;
          }
        }
      })
    };
    yield node;
  }
  constructor() {
    this.cache = /* @__PURE__ */ new WeakMap();
  }
};
function $bda7a7e55e1ff206$var$iterable(iterator) {
  let cache = [];
  let iterable = null;
  return {
    *[Symbol.iterator]() {
      for (let item of cache) yield item;
      if (!iterable) iterable = iterator();
      for (let item of iterable) {
        cache.push(item);
        yield item;
      }
    }
  };
}
function $bda7a7e55e1ff206$var$compose(outer, inner) {
  if (outer && inner) return (element) => outer(inner(element));
  if (outer) return outer;
  if (inner) return inner;
}
function $bda7a7e55e1ff206$var$capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

// node_modules/react-stately/dist/private/collections/useCollection.mjs
var import_react43 = require("react");
function $d03379b88399b8c5$export$6cd28814d92fa9c9(props, factory, context) {
  let builder = (0, import_react43.useMemo)(() => new (0, $bda7a7e55e1ff206$export$bf788dd355e3a401)(), []);
  let { children, items, collection } = props;
  let result = (0, import_react43.useMemo)(() => {
    if (collection) return collection;
    let nodes = builder.build({
      children,
      items
    }, context);
    return factory(nodes);
  }, [
    builder,
    children,
    items,
    collection,
    context,
    factory
  ]);
  return result;
}

// node_modules/react-stately/dist/private/list/useListState.mjs
var import_react44 = require("react");
function $b14b6f590b50af39$export$2f645645f7bca764(props) {
  let { filter, layoutDelegate } = props;
  let selectionState = (0, $60f19cefd567a3e4$export$253fe78d46329472)(props);
  let disabledKeys = (0, import_react44.useMemo)(() => props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set(), [
    props.disabledKeys
  ]);
  let factory = (0, import_react44.useCallback)((nodes) => filter ? new (0, $f664a81d022446b5$export$d085fb9e920b5ca7)(filter(nodes)) : new (0, $f664a81d022446b5$export$d085fb9e920b5ca7)(nodes), [
    filter
  ]);
  let context = (0, import_react44.useMemo)(() => ({
    suppressTextValueWarning: props.suppressTextValueWarning
  }), [
    props.suppressTextValueWarning
  ]);
  let collection = (0, $d03379b88399b8c5$export$6cd28814d92fa9c9)(props, factory, context);
  let selectionManager = (0, import_react44.useMemo)(() => new (0, $4a07ac835f260f78$export$6c8a5aaad13c9852)(collection, selectionState, {
    layoutDelegate
  }), [
    collection,
    selectionState,
    layoutDelegate
  ]);
  $b14b6f590b50af39$var$useFocusedKeyReset(collection, selectionManager);
  return {
    collection,
    disabledKeys,
    selectionManager
  };
}
function $b14b6f590b50af39$var$useFocusedKeyReset(collection, selectionManager) {
  const cachedCollection = (0, import_react44.useRef)(null);
  (0, import_react44.useEffect)(() => {
    if (selectionManager.focusedKey != null && !collection.getItem(selectionManager.focusedKey) && cachedCollection.current) {
      let key = cachedCollection.current.getKeyAfter(selectionManager.focusedKey);
      let nextFocusedKey = null;
      while (key != null) {
        let node = collection.getItem(key);
        if (node && node.type === "item" && !selectionManager.isDisabled(key)) {
          nextFocusedKey = key;
          break;
        }
        key = cachedCollection.current.getKeyAfter(key);
      }
      if (nextFocusedKey == null) {
        key = cachedCollection.current.getKeyBefore(selectionManager.focusedKey);
        while (key != null) {
          let node = collection.getItem(key);
          if (node && node.type === "item" && !selectionManager.isDisabled(key)) {
            nextFocusedKey = key;
            break;
          }
          key = cachedCollection.current.getKeyBefore(key);
        }
      }
      selectionManager.setFocusedKey(nextFocusedKey);
    }
    cachedCollection.current = collection;
  }, [
    collection,
    selectionManager
  ]);
}

// node_modules/react-aria/dist/private/overlays/ariaHideOutside.mjs
var $58196c8d6a1f38fc$var$supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
function $58196c8d6a1f38fc$var$isAlwaysVisibleNode(node) {
  return node.dataset.liveAnnouncer === "true" || node.dataset.reactAriaTopLayer !== void 0;
}
var $58196c8d6a1f38fc$var$refCountMap = /* @__PURE__ */ new WeakMap();
var $58196c8d6a1f38fc$var$observerStack = [];
function $58196c8d6a1f38fc$export$1c3ebcada18427bf(targets, options) {
  let windowObj = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(targets?.[0]);
  let opts = options instanceof windowObj.Element ? {
    root: options
  } : options;
  let root = opts?.root ?? document.body;
  let shouldUseInert = opts?.shouldUseInert && $58196c8d6a1f38fc$var$supportsInert;
  let visibleNodes = new Set(targets);
  let hiddenNodes = /* @__PURE__ */ new Set();
  let getHidden = (element) => {
    return shouldUseInert && element instanceof windowObj.HTMLElement ? element.inert : element.getAttribute("aria-hidden") === "true";
  };
  let setHidden = (element, hidden) => {
    if (shouldUseInert && element instanceof windowObj.HTMLElement) element.inert = hidden;
    else if (hidden) element.setAttribute("aria-hidden", "true");
    else {
      element.removeAttribute("aria-hidden");
      if (element instanceof windowObj.HTMLElement)
        element.inert = false;
    }
  };
  let shadowRootsToWatch = /* @__PURE__ */ new Set();
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) {
    let boundary = root.getRootNode();
    for (let target of targets) {
      let current = target.getRootNode();
      while ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(current) && current !== boundary) {
        shadowRootsToWatch.add(current);
        current = current.host.getRootNode();
      }
    }
  }
  let walk = (root2) => {
    for (let element of root2.querySelectorAll("[data-live-announcer], [data-react-aria-top-layer]")) visibleNodes.add(element);
    let acceptNode = (node) => {
      if (hiddenNodes.has(node) || visibleNodes.has(node) || node.parentElement && hiddenNodes.has(node.parentElement) && node.parentElement.getAttribute("role") !== "row") return NodeFilter.FILTER_REJECT;
      for (let target of visibleNodes) {
        if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(node, target)) return NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    };
    let walker = (0, $654b97e09f2a30c1$export$4d0f8be8b12a7ef6)((0, $d447af545b77c9f1$export$b204af158042fbac)(root2), root2, NodeFilter.SHOW_ELEMENT, {
      acceptNode
    });
    let acceptRoot = acceptNode(root2);
    if (acceptRoot === NodeFilter.FILTER_ACCEPT) hide(root2);
    if (acceptRoot !== NodeFilter.FILTER_REJECT) {
      let node = walker.nextNode();
      while (node != null) {
        hide(node);
        node = walker.nextNode();
      }
    }
  };
  let hide = (node) => {
    let refCount = $58196c8d6a1f38fc$var$refCountMap.get(node) ?? 0;
    if (getHidden(node) && refCount === 0) return;
    if (refCount === 0) setHidden(node, true);
    hiddenNodes.add(node);
    $58196c8d6a1f38fc$var$refCountMap.set(node, refCount + 1);
  };
  if ($58196c8d6a1f38fc$var$observerStack.length) $58196c8d6a1f38fc$var$observerStack[$58196c8d6a1f38fc$var$observerStack.length - 1].disconnect();
  walk(root);
  let observer = new MutationObserver((changes) => {
    for (let change of changes) {
      if (change.type !== "childList") continue;
      if (change.target.isConnected && ![
        ...visibleNodes,
        ...hiddenNodes
      ].some((node) => (0, $23f2114a1b82827e$export$4282f70798064fe0)(node, change.target))) for (let node of change.addedNodes) {
        if ((node instanceof HTMLElement || node instanceof SVGElement) && $58196c8d6a1f38fc$var$isAlwaysVisibleNode(node)) visibleNodes.add(node);
        else if (node instanceof Element) walk(node);
      }
      if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) {
        for (let shadowRoot of shadowRootsToWatch) if (!shadowRoot.isConnected) {
          observer.disconnect();
          break;
        }
      }
    }
  });
  observer.observe(root, {
    childList: true,
    subtree: true
  });
  let shadowObservers = /* @__PURE__ */ new Set();
  if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) for (let shadowRoot of shadowRootsToWatch) {
    let shadowObserver = new MutationObserver((changes) => {
      for (let change of changes) {
        if (change.type !== "childList") continue;
        if (change.target.isConnected && ![
          ...visibleNodes,
          ...hiddenNodes
        ].some((node) => (0, $23f2114a1b82827e$export$4282f70798064fe0)(node, change.target))) for (let node of change.addedNodes) {
          if ((node instanceof HTMLElement || node instanceof SVGElement) && $58196c8d6a1f38fc$var$isAlwaysVisibleNode(node)) visibleNodes.add(node);
          else if (node instanceof Element) walk(node);
        }
        if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) {
          for (let shadowRoot2 of shadowRootsToWatch) if (!shadowRoot2.isConnected) {
            observer.disconnect();
            break;
          }
        }
      }
    });
    shadowObserver.observe(shadowRoot, {
      childList: true,
      subtree: true
    });
    shadowObservers.add(shadowObserver);
  }
  let observerWrapper = {
    visibleNodes,
    hiddenNodes,
    observe() {
      observer.observe(root, {
        childList: true,
        subtree: true
      });
    },
    disconnect() {
      observer.disconnect();
    }
  };
  $58196c8d6a1f38fc$var$observerStack.push(observerWrapper);
  return () => {
    observer.disconnect();
    if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) for (let shadowObserver of shadowObservers) shadowObserver.disconnect();
    for (let node of hiddenNodes) {
      let count = $58196c8d6a1f38fc$var$refCountMap.get(node);
      if (count == null) continue;
      if (count === 1) {
        setHidden(node, false);
        $58196c8d6a1f38fc$var$refCountMap.delete(node);
      } else $58196c8d6a1f38fc$var$refCountMap.set(node, count - 1);
    }
    if (observerWrapper === $58196c8d6a1f38fc$var$observerStack[$58196c8d6a1f38fc$var$observerStack.length - 1]) {
      $58196c8d6a1f38fc$var$observerStack.pop();
      if ($58196c8d6a1f38fc$var$observerStack.length) $58196c8d6a1f38fc$var$observerStack[$58196c8d6a1f38fc$var$observerStack.length - 1].observe();
    } else $58196c8d6a1f38fc$var$observerStack.splice($58196c8d6a1f38fc$var$observerStack.indexOf(observerWrapper), 1);
  };
}
function $58196c8d6a1f38fc$export$1020fa7f77e17884(element) {
  let observer = $58196c8d6a1f38fc$var$observerStack[$58196c8d6a1f38fc$var$observerStack.length - 1];
  if (observer && !observer.visibleNodes.has(element)) {
    observer.visibleNodes.add(element);
    return () => {
      observer.visibleNodes.delete(element);
    };
  }
}

// node_modules/react-aria/dist/private/interactions/useInteractOutside.mjs
var import_react45 = require("react");
function $e260d131964da0f9$export$872b660ac5a1ff98(props) {
  let { ref, onInteractOutside, isDisabled, onInteractOutsideStart } = props;
  let stateRef = (0, import_react45.useRef)({
    isPointerDown: false,
    ignoreEmulatedMouseEvents: false
  });
  let onPointerDown = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)((e) => {
    if (onInteractOutside && $e260d131964da0f9$var$isValidEvent(e, ref)) {
      if (onInteractOutsideStart) onInteractOutsideStart(e);
      stateRef.current.isPointerDown = true;
    }
  });
  let triggerInteractOutside = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)((e) => {
    if (onInteractOutside) onInteractOutside(e);
  });
  (0, import_react45.useEffect)(() => {
    let state = stateRef.current;
    if (isDisabled) return;
    const element = ref.current;
    const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
    if (typeof PointerEvent !== "undefined") {
      let onClick = (e) => {
        if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e, ref)) triggerInteractOutside(e);
        state.isPointerDown = false;
      };
      documentObject.addEventListener("pointerdown", onPointerDown, true);
      documentObject.addEventListener("click", onClick, true);
      return () => {
        documentObject.removeEventListener("pointerdown", onPointerDown, true);
        documentObject.removeEventListener("click", onClick, true);
      };
    } else if (false) {
      let onMouseUp = (e) => {
        if (state.ignoreEmulatedMouseEvents) state.ignoreEmulatedMouseEvents = false;
        else if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e, ref)) triggerInteractOutside(e);
        state.isPointerDown = false;
      };
      let onTouchEnd = (e) => {
        state.ignoreEmulatedMouseEvents = true;
        if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e, ref)) triggerInteractOutside(e);
        state.isPointerDown = false;
      };
      documentObject.addEventListener("mousedown", onPointerDown, true);
      documentObject.addEventListener("mouseup", onMouseUp, true);
      documentObject.addEventListener("touchstart", onPointerDown, true);
      documentObject.addEventListener("touchend", onTouchEnd, true);
      return () => {
        documentObject.removeEventListener("mousedown", onPointerDown, true);
        documentObject.removeEventListener("mouseup", onMouseUp, true);
        documentObject.removeEventListener("touchstart", onPointerDown, true);
        documentObject.removeEventListener("touchend", onTouchEnd, true);
      };
    }
  }, [
    ref,
    isDisabled
  ]);
}
function $e260d131964da0f9$var$isValidEvent(event, ref) {
  if (event.button > 0) return false;
  let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event);
  if (target) {
    const ownerDocument = target.ownerDocument;
    if (!ownerDocument || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(ownerDocument.documentElement, target)) return false;
    if (target.closest("[data-react-aria-top-layer]")) return false;
  }
  if (!ref.current) return false;
  return !event.composedPath().includes(ref.current);
}

// node_modules/react-aria/dist/private/overlays/useOverlay.mjs
var import_react46 = require("react");
var $77844860df94ba23$var$visibleOverlays = [];
function $77844860df94ba23$export$ea8f71083e90600f(props, ref) {
  let { onClose, shouldCloseOnBlur, isOpen, isDismissable = false, isKeyboardDismissDisabled = false, shouldCloseOnInteractOutside } = props;
  let lastVisibleOverlay = (0, import_react46.useRef)(void 0);
  (0, import_react46.useEffect)(() => {
    if (isOpen && !$77844860df94ba23$var$visibleOverlays.includes(ref)) {
      $77844860df94ba23$var$visibleOverlays.push(ref);
      return () => {
        let index = $77844860df94ba23$var$visibleOverlays.indexOf(ref);
        if (index >= 0) $77844860df94ba23$var$visibleOverlays.splice(index, 1);
      };
    }
  }, [
    isOpen,
    ref
  ]);
  let onHide = () => {
    if ($77844860df94ba23$var$visibleOverlays[$77844860df94ba23$var$visibleOverlays.length - 1] === ref && onClose) onClose();
  };
  let onInteractOutsideStart = (e) => {
    const topMostOverlay = $77844860df94ba23$var$visibleOverlays[$77844860df94ba23$var$visibleOverlays.length - 1];
    lastVisibleOverlay.current = topMostOverlay;
    if (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
      if (topMostOverlay === ref) e.stopPropagation();
    }
  };
  let onInteractOutside = (e) => {
    if (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) {
      if ($77844860df94ba23$var$visibleOverlays[$77844860df94ba23$var$visibleOverlays.length - 1] === ref) e.stopPropagation();
      if (lastVisibleOverlay.current === ref) onHide();
    }
    lastVisibleOverlay.current = void 0;
  };
  let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)({
    shortcuts: {
      Escape: () => {
        if (!isKeyboardDismissDisabled) {
          onHide();
          return;
        }
        return false;
      }
    }
  });
  (0, $e260d131964da0f9$export$872b660ac5a1ff98)({
    ref,
    onInteractOutside: isDismissable && isOpen ? onInteractOutside : void 0,
    onInteractOutsideStart
  });
  let { focusWithinProps } = (0, $2c9edc598a03d523$export$420e68273165f4ec)({
    isDisabled: !shouldCloseOnBlur,
    onBlurWithin: (e) => {
      if (!e.relatedTarget || (0, $535772f9d2c1f38d$export$1258395f99bf9cbf)(e.relatedTarget)) return;
      if (!shouldCloseOnInteractOutside || shouldCloseOnInteractOutside(e.relatedTarget)) onClose?.();
    }
  });
  return {
    overlayProps: {
      ...keyboardProps,
      ...focusWithinProps
    },
    underlayProps: {}
  };
}

// node_modules/react-aria/dist/private/utils/runAfterKeyboard.mjs
var $e0a0e4399f316b76$var$WEBKIT_OPEN_DELAY = 200;
var $e0a0e4399f316b76$var$TRANSITION_FRAMETIME = 50;
var $e0a0e4399f316b76$var$TRANSITION_TIMEOUT = 600;
var $e0a0e4399f316b76$var$listenersByWindow = /* @__PURE__ */ new WeakMap();
var $e0a0e4399f316b76$var$transitionCallbacks = /* @__PURE__ */ new Set();
var $e0a0e4399f316b76$var$resizeCallbacks = /* @__PURE__ */ new Set();
function $e0a0e4399f316b76$var$onTransitionFrame(wasOpenKeyboard, signal) {
  let isOpenKeyboard = (0, $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7)();
  if (wasOpenKeyboard !== isOpenKeyboard || signal.aborted) for (let callback of $e0a0e4399f316b76$var$resizeCallbacks) {
    callback(isOpenKeyboard);
    $e0a0e4399f316b76$var$resizeCallbacks.delete(callback);
  }
  if (!wasOpenKeyboard && isOpenKeyboard && (0, $2add3ce32c6007eb$export$78551043582a6a98)() && !signal.aborted) {
    window.clearInterval($e0a0e4399f316b76$var$listenersByWindow.get(window));
    $e0a0e4399f316b76$var$listenersByWindow.set(window, $e0a0e4399f316b76$var$setupGlobalListeners($e0a0e4399f316b76$var$WEBKIT_OPEN_DELAY));
    return;
  }
  if (wasOpenKeyboard !== isOpenKeyboard || signal.aborted) for (let callback of $e0a0e4399f316b76$var$transitionCallbacks) {
    callback(isOpenKeyboard);
    $e0a0e4399f316b76$var$transitionCallbacks.delete(callback);
  }
  if ($e0a0e4399f316b76$var$resizeCallbacks.size + $e0a0e4399f316b76$var$transitionCallbacks.size <= 0 || signal.aborted) {
    window.clearInterval($e0a0e4399f316b76$var$listenersByWindow.get(window));
    $e0a0e4399f316b76$var$listenersByWindow.delete(window);
  }
}
function $e0a0e4399f316b76$var$setupGlobalListeners(timeout = $e0a0e4399f316b76$var$TRANSITION_TIMEOUT) {
  return window.setInterval($e0a0e4399f316b76$var$onTransitionFrame, $e0a0e4399f316b76$var$TRANSITION_FRAMETIME, (0, $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7)(), AbortSignal.timeout(timeout));
}
function $e0a0e4399f316b76$export$b80f73f72d03c10f(fn) {
  if (!(0, $bb39c0fc1c19b34c$export$a986ed8aea890397)()) return fn(false), () => {
  };
  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      let activeElement = document.hasFocus() ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() : null;
      let willKeyboardOpen = (0, $bb39c0fc1c19b34c$export$c57958e35f31ed73)(activeElement);
      if ((0, $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7)() === willKeyboardOpen) return fn(willKeyboardOpen);
      if ((0, $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7)() && !willKeyboardOpen) return fn(willKeyboardOpen);
      $e0a0e4399f316b76$var$resizeCallbacks.add(fn);
      if (!$e0a0e4399f316b76$var$listenersByWindow.has(window)) $e0a0e4399f316b76$var$listenersByWindow.set(window, $e0a0e4399f316b76$var$setupGlobalListeners());
    });
  });
  return () => {
    window.cancelAnimationFrame(frame);
    $e0a0e4399f316b76$var$resizeCallbacks.delete(fn);
  };
}
function $e0a0e4399f316b76$export$c82b8fe1ad51fcd9(fn) {
  if (!(0, $bb39c0fc1c19b34c$export$a986ed8aea890397)()) return fn(false), () => {
  };
  let frame = window.requestAnimationFrame(() => {
    frame = window.requestAnimationFrame(() => {
      let activeElement = document.hasFocus() ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() : null;
      let willKeyboardOpen = (0, $bb39c0fc1c19b34c$export$c57958e35f31ed73)(activeElement);
      if ((0, $bb39c0fc1c19b34c$export$b1f1c83775b8b5f7)() === willKeyboardOpen) return fn(willKeyboardOpen);
      $e0a0e4399f316b76$var$transitionCallbacks.add(fn);
      if (!$e0a0e4399f316b76$var$listenersByWindow.has(window)) $e0a0e4399f316b76$var$listenersByWindow.set(window, $e0a0e4399f316b76$var$setupGlobalListeners());
    });
  });
  return () => {
    window.cancelAnimationFrame(frame);
    $e0a0e4399f316b76$var$transitionCallbacks.delete(fn);
  };
}

// node_modules/react-aria/dist/private/overlays/usePreventScroll.mjs
var $0644e3663365bfe5$var$visualViewport = typeof document !== "undefined" && window.visualViewport;
var $0644e3663365bfe5$var$preventScrollCount = 0;
var $0644e3663365bfe5$var$restore;
function $0644e3663365bfe5$export$ee0f7cc6afcd1c18(options = {}) {
  let { isDisabled, UNSTABLE_overrideFocus } = options;
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isDisabled) return;
    $0644e3663365bfe5$var$preventScrollCount++;
    if ($0644e3663365bfe5$var$preventScrollCount === 1) {
      if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) $0644e3663365bfe5$var$restore = $0644e3663365bfe5$var$preventScrollMobileWebKit();
      else $0644e3663365bfe5$var$restore = $0644e3663365bfe5$var$preventScrollStandard(UNSTABLE_overrideFocus);
    }
    return () => {
      $0644e3663365bfe5$var$preventScrollCount--;
      if ($0644e3663365bfe5$var$preventScrollCount === 0) $0644e3663365bfe5$var$restore();
    };
  }, [
    isDisabled,
    UNSTABLE_overrideFocus
  ]);
}
function $0644e3663365bfe5$var$preventScrollStandard(UNSTABLE_overrideFocus) {
  let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  return (0, $a4e76a5424781910$export$e08e3b67e392101e)(scrollbarWidth > 0 && // Use scrollbar-gutter when supported because it also works for fixed positioned elements.
  ("scrollbarGutter" in document.documentElement.style ? (0, $d447af545b77c9f1$export$37a5fde709c1db82)(document.documentElement, "scrollbar-gutter", "stable") : (0, $d447af545b77c9f1$export$37a5fde709c1db82)(document.documentElement, "padding-right", `${scrollbarWidth}px`)), (0, $d447af545b77c9f1$export$37a5fde709c1db82)(document.documentElement, "overflow", "hidden"), UNSTABLE_overrideFocus && $0644e3663365bfe5$var$overrideFocus(), UNSTABLE_overrideFocus && (0, $bb39c0fc1c19b34c$export$a986ed8aea890397)() && $0644e3663365bfe5$var$handleBlur());
}
function $0644e3663365bfe5$var$preventScrollMobileWebKit() {
  let restoreOverflow = (0, $d447af545b77c9f1$export$37a5fde709c1db82)(document.documentElement, "overflow", "hidden");
  let scrollable;
  let allowTouchMove = false;
  let onTouchStart = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    scrollable = (0, $901761b40e390936$export$2bb74740c4e19def)(target, true) ? target : (0, $3578607fe3d4b096$export$cfa2225e87938781)(target, true);
    allowTouchMove = false;
    let selection = target.ownerDocument.defaultView.getSelection();
    if (selection && !selection.isCollapsed && selection.containsNode(target, true)) allowTouchMove = true;
    if (e.composedPath().some((el) => el instanceof HTMLInputElement && el.type === "range")) allowTouchMove = true;
    if ("selectionStart" in target && "selectionEnd" in target && target.selectionStart < target.selectionEnd && target.ownerDocument.activeElement === target) allowTouchMove = true;
  };
  let style = document.createElement("style");
  let nonce = (0, $2b2d34ff061957fb$export$2b85b721e524d74b)();
  if (nonce) style.nonce = nonce;
  style.textContent = `
@layer {
  * {
    overscroll-behavior: contain;
  }
}`.trim();
  document.head.prepend(style);
  let onTouchMove = (e) => {
    if (e.touches.length === 2 || allowTouchMove) return;
    if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
      e.preventDefault();
      return;
    }
    if (scrollable.scrollHeight === scrollable.clientHeight && scrollable.scrollWidth === scrollable.clientWidth) e.preventDefault();
  };
  let restoreFocus = $0644e3663365bfe5$var$overrideFocus();
  let removeEvents = (0, $a4e76a5424781910$export$e08e3b67e392101e)((0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "touchstart", onTouchStart, {
    passive: false,
    capture: true
  }), (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "touchmove", onTouchMove, {
    passive: false,
    capture: true
  }), $0644e3663365bfe5$var$handleBlur());
  return () => {
    restoreOverflow();
    removeEvents();
    style.remove();
    restoreFocus();
  };
}
function $0644e3663365bfe5$var$handleBlur() {
  let onBlur = (e) => {
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e);
    let relatedTarget = e.relatedTarget;
    if (relatedTarget && (0, $bb39c0fc1c19b34c$export$c57958e35f31ed73)(relatedTarget))
      relatedTarget.focus();
    else if (!relatedTarget) {
      let focusable = target.parentElement?.closest("[tabindex]");
      focusable?.focus({
        preventScroll: true
      });
    }
  };
  return (0, $d447af545b77c9f1$export$f531f92e2a15358f)(document, "blur", onBlur, true);
}
function $0644e3663365bfe5$var$overrideFocus() {
  let focus = HTMLElement.prototype.focus;
  Reflect.defineProperty(HTMLElement.prototype, "focus", {
    configurable: true,
    writable: true,
    value: function(opts) {
      focus.call(this, {
        ...opts,
        preventScroll: true
      });
      if (!opts || !opts.preventScroll) {
        let scroll = () => {
          let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
          if (activeElement === this) $0644e3663365bfe5$var$scrollIntoView(this);
        };
        (0, $e0a0e4399f316b76$export$b80f73f72d03c10f)((isOpen) => isOpen ? scroll() : (0, $e0a0e4399f316b76$export$c82b8fe1ad51fcd9)(() => scroll()));
      }
    }
  });
  return () => {
    Reflect.defineProperty(HTMLElement.prototype, "focus", {
      configurable: true,
      writable: true,
      value: focus
    });
  };
}
function $0644e3663365bfe5$var$scrollIntoView(target) {
  let root = document.scrollingElement || document.documentElement;
  let nextTarget = target;
  while (nextTarget && nextTarget !== root && nextTarget.isConnected) {
    let scrollable = (0, $3578607fe3d4b096$export$cfa2225e87938781)(nextTarget);
    if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== nextTarget) {
      let scrollableRect = scrollable.getBoundingClientRect();
      let targetRect = nextTarget.getBoundingClientRect();
      if (targetRect.top < scrollableRect.top || targetRect.bottom > scrollableRect.top + nextTarget.clientHeight) {
        let bottom = scrollableRect.bottom;
        if ($0644e3663365bfe5$var$visualViewport) bottom = Math.min(bottom, $0644e3663365bfe5$var$visualViewport.offsetTop + $0644e3663365bfe5$var$visualViewport.height);
        let adjustment = targetRect.top - scrollableRect.top - ((bottom - scrollableRect.top) / 2 - targetRect.height / 2);
        scrollable.scrollTo({
          // Clamp to the valid range to prevent over-scrolling.
          top: Math.max(0, Math.min(scrollable.scrollHeight - scrollable.clientHeight, scrollable.scrollTop + adjustment)),
          behavior: "smooth"
        });
      }
    }
    nextTarget = scrollable.parentElement;
  }
}

// node_modules/react-aria/dist/private/intl/overlays/ar-AE.mjs
var $e5024b484f7c3e21$exports = {};
$e5024b484f7c3e21$exports = {
  "dismiss": `\u062A\u062C\u0627\u0647\u0644`
};

// node_modules/react-aria/dist/private/intl/overlays/bg-BG.mjs
var $0c4209a7da92851c$exports = {};
$0c4209a7da92851c$exports = {
  "dismiss": `\u041E\u0442\u0445\u0432\u044A\u0440\u043B\u044F\u043D\u0435`
};

// node_modules/react-aria/dist/private/intl/overlays/cs-CZ.mjs
var $75fa0397632d287b$exports = {};
$75fa0397632d287b$exports = {
  "dismiss": `Odstranit`
};

// node_modules/react-aria/dist/private/intl/overlays/da-DK.mjs
var $3fc6e6880cad247e$exports = {};
$3fc6e6880cad247e$exports = {
  "dismiss": `Luk`
};

// node_modules/react-aria/dist/private/intl/overlays/de-DE.mjs
var $5f637eb0c91d0f64$exports = {};
$5f637eb0c91d0f64$exports = {
  "dismiss": `Schlie\xDFen`
};

// node_modules/react-aria/dist/private/intl/overlays/el-GR.mjs
var $5a0b3a154dcf111b$exports = {};
$5a0b3a154dcf111b$exports = {
  "dismiss": `\u0391\u03C0\u03CC\u03C1\u03C1\u03B9\u03C8\u03B7`
};

// node_modules/react-aria/dist/private/intl/overlays/en-US.mjs
var $ea518f18e6f13288$exports = {};
$ea518f18e6f13288$exports = {
  "dismiss": `Dismiss`
};

// node_modules/react-aria/dist/private/intl/overlays/es-ES.mjs
var $3bf3cb0ce48a8078$exports = {};
$3bf3cb0ce48a8078$exports = {
  "dismiss": `Descartar`
};

// node_modules/react-aria/dist/private/intl/overlays/et-EE.mjs
var $a416146243e75233$exports = {};
$a416146243e75233$exports = {
  "dismiss": `L\xF5peta`
};

// node_modules/react-aria/dist/private/intl/overlays/fi-FI.mjs
var $2872659e6c428111$exports = {};
$2872659e6c428111$exports = {
  "dismiss": `Hylk\xE4\xE4`
};

// node_modules/react-aria/dist/private/intl/overlays/fr-FR.mjs
var $657a7a1f03941145$exports = {};
$657a7a1f03941145$exports = {
  "dismiss": `Rejeter`
};

// node_modules/react-aria/dist/private/intl/overlays/he-IL.mjs
var $9f18aee5ddbe5e0f$exports = {};
$9f18aee5ddbe5e0f$exports = {
  "dismiss": `\u05D4\u05EA\u05E2\u05DC\u05DD`
};

// node_modules/react-aria/dist/private/intl/overlays/hr-HR.mjs
var $e2e63adb0c1f3db6$exports = {};
$e2e63adb0c1f3db6$exports = {
  "dismiss": `Odbaci`
};

// node_modules/react-aria/dist/private/intl/overlays/hu-HU.mjs
var $46fbd53e8bc70315$exports = {};
$46fbd53e8bc70315$exports = {
  "dismiss": `Elutas\xEDt\xE1s`
};

// node_modules/react-aria/dist/private/intl/overlays/it-IT.mjs
var $47234f3018c55486$exports = {};
$47234f3018c55486$exports = {
  "dismiss": `Ignora`
};

// node_modules/react-aria/dist/private/intl/overlays/ja-JP.mjs
var $0dfacfad01736641$exports = {};
$0dfacfad01736641$exports = {
  "dismiss": `\u9589\u3058\u308B`
};

// node_modules/react-aria/dist/private/intl/overlays/ko-KR.mjs
var $a9056b50f6fbb1ef$exports = {};
$a9056b50f6fbb1ef$exports = {
  "dismiss": `\uBB34\uC2DC`
};

// node_modules/react-aria/dist/private/intl/overlays/lt-LT.mjs
var $217b78056fce917f$exports = {};
$217b78056fce917f$exports = {
  "dismiss": `Atmesti`
};

// node_modules/react-aria/dist/private/intl/overlays/lv-LV.mjs
var $c32f8c2b8956f20a$exports = {};
$c32f8c2b8956f20a$exports = {
  "dismiss": `Ner\u0101d\u012Bt`
};

// node_modules/react-aria/dist/private/intl/overlays/nb-NO.mjs
var $f65392426e2dae6a$exports = {};
$f65392426e2dae6a$exports = {
  "dismiss": `Lukk`
};

// node_modules/react-aria/dist/private/intl/overlays/nl-NL.mjs
var $1d0fa5f3cc68e5b0$exports = {};
$1d0fa5f3cc68e5b0$exports = {
  "dismiss": `Negeren`
};

// node_modules/react-aria/dist/private/intl/overlays/pl-PL.mjs
var $ff8aa6518e51f809$exports = {};
$ff8aa6518e51f809$exports = {
  "dismiss": `Zignoruj`
};

// node_modules/react-aria/dist/private/intl/overlays/pt-BR.mjs
var $fe3a4eb3eebfb0a2$exports = {};
$fe3a4eb3eebfb0a2$exports = {
  "dismiss": `Descartar`
};

// node_modules/react-aria/dist/private/intl/overlays/pt-PT.mjs
var $f692c6bcabd26695$exports = {};
$f692c6bcabd26695$exports = {
  "dismiss": `Dispensar`
};

// node_modules/react-aria/dist/private/intl/overlays/ro-RO.mjs
var $627fbb16c92fb654$exports = {};
$627fbb16c92fb654$exports = {
  "dismiss": `Revocare`
};

// node_modules/react-aria/dist/private/intl/overlays/ru-RU.mjs
var $2c9c1dfc72c7bac2$exports = {};
$2c9c1dfc72c7bac2$exports = {
  "dismiss": `\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C`
};

// node_modules/react-aria/dist/private/intl/overlays/sk-SK.mjs
var $7e7ece760f897013$exports = {};
$7e7ece760f897013$exports = {
  "dismiss": `Zru\u0161i\u0165`
};

// node_modules/react-aria/dist/private/intl/overlays/sl-SI.mjs
var $1e894e47be1bf217$exports = {};
$1e894e47be1bf217$exports = {
  "dismiss": `Opusti`
};

// node_modules/react-aria/dist/private/intl/overlays/sr-SP.mjs
var $f4ce49adf6ef095f$exports = {};
$f4ce49adf6ef095f$exports = {
  "dismiss": `Odbaci`
};

// node_modules/react-aria/dist/private/intl/overlays/sv-SE.mjs
var $7c9dc206185355b5$exports = {};
$7c9dc206185355b5$exports = {
  "dismiss": `Avvisa`
};

// node_modules/react-aria/dist/private/intl/overlays/tr-TR.mjs
var $c288097c5ef4ae98$exports = {};
$c288097c5ef4ae98$exports = {
  "dismiss": `Kapat`
};

// node_modules/react-aria/dist/private/intl/overlays/uk-UA.mjs
var $d5863f94ad4c3f07$exports = {};
$d5863f94ad4c3f07$exports = {
  "dismiss": `\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438`
};

// node_modules/react-aria/dist/private/intl/overlays/zh-CN.mjs
var $34a6eb7890264192$exports = {};
$34a6eb7890264192$exports = {
  "dismiss": `\u53D6\u6D88`
};

// node_modules/react-aria/dist/private/intl/overlays/zh-TW.mjs
var $79ae244e9d286cb7$exports = {};
$79ae244e9d286cb7$exports = {
  "dismiss": `\u95DC\u9589`
};

// node_modules/react-aria/dist/private/overlays/intlStrings.mjs
var $8ad4f9eb0c0f6434$exports = {};
$8ad4f9eb0c0f6434$exports = {
  "ar-AE": $e5024b484f7c3e21$exports,
  "bg-BG": $0c4209a7da92851c$exports,
  "cs-CZ": $75fa0397632d287b$exports,
  "da-DK": $3fc6e6880cad247e$exports,
  "de-DE": $5f637eb0c91d0f64$exports,
  "el-GR": $5a0b3a154dcf111b$exports,
  "en-US": $ea518f18e6f13288$exports,
  "es-ES": $3bf3cb0ce48a8078$exports,
  "et-EE": $a416146243e75233$exports,
  "fi-FI": $2872659e6c428111$exports,
  "fr-FR": $657a7a1f03941145$exports,
  "he-IL": $9f18aee5ddbe5e0f$exports,
  "hr-HR": $e2e63adb0c1f3db6$exports,
  "hu-HU": $46fbd53e8bc70315$exports,
  "it-IT": $47234f3018c55486$exports,
  "ja-JP": $0dfacfad01736641$exports,
  "ko-KR": $a9056b50f6fbb1ef$exports,
  "lt-LT": $217b78056fce917f$exports,
  "lv-LV": $c32f8c2b8956f20a$exports,
  "nb-NO": $f65392426e2dae6a$exports,
  "nl-NL": $1d0fa5f3cc68e5b0$exports,
  "pl-PL": $ff8aa6518e51f809$exports,
  "pt-BR": $fe3a4eb3eebfb0a2$exports,
  "pt-PT": $f692c6bcabd26695$exports,
  "ro-RO": $627fbb16c92fb654$exports,
  "ru-RU": $2c9c1dfc72c7bac2$exports,
  "sk-SK": $7e7ece760f897013$exports,
  "sl-SI": $1e894e47be1bf217$exports,
  "sr-SP": $f4ce49adf6ef095f$exports,
  "sv-SE": $7c9dc206185355b5$exports,
  "tr-TR": $c288097c5ef4ae98$exports,
  "uk-UA": $d5863f94ad4c3f07$exports,
  "zh-CN": $34a6eb7890264192$exports,
  "zh-TW": $79ae244e9d286cb7$exports
};

// node_modules/react-aria/dist/private/overlays/DismissButton.mjs
var import_react47 = __toESM(require("react"), 1);
function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}
function $081058010ef8962e$export$2317d149ed6f78c4(props) {
  let { onDismiss, ...otherProps } = props;
  let stringFormatter = (0, $cf2482eff2eeeec2$export$f12b703ca79dfbb1)((0, $parcel$interopDefault($8ad4f9eb0c0f6434$exports)), "@react-aria/overlays");
  let labels = (0, $e8ac3c3f5d4bae7f$export$d6875122194c7b44)(otherProps, stringFormatter.format("dismiss"));
  let onClick = () => {
    if (onDismiss) onDismiss();
  };
  return /* @__PURE__ */ (0, import_react47.default).createElement((0, $ea3928288112382f$export$439d29a4e110a164), null, /* @__PURE__ */ (0, import_react47.default).createElement("button", {
    ...labels,
    tabIndex: -1,
    onClick,
    style: {
      width: 1,
      height: 1
    }
  }));
}

// node_modules/react-aria/dist/private/interactions/PressResponder.mjs
var import_react48 = __toESM(require("react"), 1);
function $0d47b37c475c5231$export$cf75428e0b9ed1ea({ children }) {
  let context = (0, import_react48.useMemo)(() => ({
    register: () => {
    }
  }), []);
  return /* @__PURE__ */ (0, import_react48.default).createElement((0, $24f9a20f226ad820$export$5165eccb35aaadb5).Provider, {
    value: context
  }, children);
}

// node_modules/react-aria/dist/private/overlays/PortalProvider.mjs
var import_react49 = __toESM(require("react"), 1);
var $72abaeab4d80592f$export$60d741e20e0aa309 = /* @__PURE__ */ (0, import_react49.createContext)({});
function $72abaeab4d80592f$export$9fc1347d4195ccb3() {
  return (0, import_react49.useContext)($72abaeab4d80592f$export$60d741e20e0aa309) ?? {};
}

// node_modules/react-aria/dist/private/overlays/Overlay.mjs
var import_react50 = __toESM(require("react"), 1);
var import_react_dom5 = __toESM(require("react-dom"), 1);
var $d7a937236970dc7f$export$a2200b96afd16271 = /* @__PURE__ */ (0, import_react50.default).createContext(null);
function $d7a937236970dc7f$export$c6fdb837b070b4ff(props) {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let { portalContainer = isSSR ? null : document.body, isExiting } = props;
  let [contain, setContain] = (0, import_react50.useState)(false);
  let contextValue = (0, import_react50.useMemo)(() => ({
    contain,
    setContain
  }), [
    contain,
    setContain
  ]);
  let { getContainer } = (0, $72abaeab4d80592f$export$9fc1347d4195ccb3)();
  if (!props.portalContainer && getContainer) portalContainer = getContainer();
  if (!portalContainer) return null;
  let contents = props.children;
  if (!props.disableFocusManagement) contents = /* @__PURE__ */ (0, import_react50.default).createElement((0, $535772f9d2c1f38d$export$20e40289641fbbb6), {
    restoreFocus: true,
    contain: (props.shouldContainFocus || contain) && !isExiting
  }, contents);
  contents = /* @__PURE__ */ (0, import_react50.default).createElement($d7a937236970dc7f$export$a2200b96afd16271.Provider, {
    value: contextValue
  }, /* @__PURE__ */ (0, import_react50.default).createElement((0, $0d47b37c475c5231$export$cf75428e0b9ed1ea), null, /* @__PURE__ */ (0, import_react50.default).createElement((0, $d1116acdf220c2da$export$f9762fab77588ecb).Provider, {
    value: null
  }, contents)));
  return /* @__PURE__ */ (0, import_react_dom5.default).createPortal(contents, portalContainer);
}
function $d7a937236970dc7f$export$14c98a7594375490() {
  let ctx = (0, import_react50.useContext)($d7a937236970dc7f$export$a2200b96afd16271);
  let setContain = ctx?.setContain;
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    setContain?.(true);
  }, [
    setContain
  ]);
}

// node_modules/react-stately/dist/private/overlays/useOverlayTriggerState.mjs
var import_react51 = require("react");
function $f11fb0bcf1b2687a$export$61c6a8c84e605fb6(props) {
  let [isOpen, setOpen] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(props.isOpen, props.defaultOpen || false, props.onOpenChange);
  let [point, setPoint] = (0, import_react51.useState)(null);
  const open = (0, import_react51.useCallback)(() => {
    setOpen(true);
  }, [
    setOpen
  ]);
  const close = (0, import_react51.useCallback)(() => {
    setOpen(false);
  }, [
    setOpen
  ]);
  const toggle = (0, import_react51.useCallback)(() => {
    setOpen(!isOpen);
  }, [
    setOpen,
    isOpen
  ]);
  return {
    isOpen,
    setOpen,
    open,
    close,
    toggle,
    point,
    setPoint
  };
}

// node_modules/react-aria/dist/private/utils/animation.mjs
var import_react_dom6 = require("react-dom");
var import_react52 = require("react");
function $fcc7165e876206c6$export$6d3443f2c48bfc20(ref, isReady = true, onEnter) {
  let [isEntering, setEntering] = (0, import_react52.useState)(true);
  let isAnimationReady = isEntering && isReady;
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (!isReady && ref.current) return (0, $a4e76a5424781910$export$e08e3b67e392101e)((0, $d447af545b77c9f1$export$37a5fde709c1db82)(ref.current, "opacity", "0"), (0, $d447af545b77c9f1$export$37a5fde709c1db82)(ref.current, "clip", "rect(0 0 0 0)"), (0, $d447af545b77c9f1$export$37a5fde709c1db82)(ref.current, "clip-path", "inset(50%)"), (0, $d447af545b77c9f1$export$37a5fde709c1db82)(ref.current, "mask-image", "linear-gradient(#0000, #0000)"));
  }, [
    ref,
    isReady
  ]);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isAnimationReady && ref.current && "getAnimations" in ref.current) {
      for (let animation of ref.current.getAnimations()) if (animation instanceof CSSTransition) animation.cancel();
    }
  }, [
    ref,
    isAnimationReady
  ]);
  $fcc7165e876206c6$var$useAnimation(ref, isAnimationReady, onEnter, (0, import_react52.useCallback)(() => setEntering(false), []));
  return isAnimationReady;
}
function $fcc7165e876206c6$export$45fda7c47f93fd48(ref, isOpen, onExit) {
  let [exitState, setExitState] = (0, import_react52.useState)(isOpen ? "open" : "closed");
  switch (exitState) {
    case "open":
      if (!isOpen) setExitState("exiting");
      break;
    case "closed":
    case "exiting":
      if (isOpen) setExitState("open");
      break;
  }
  let isExiting = exitState === "exiting";
  $fcc7165e876206c6$var$useAnimation(ref, isExiting, onExit, (0, import_react52.useCallback)(() => {
    setExitState((state) => state === "exiting" ? "closed" : state);
  }, []));
  return isExiting;
}
function $fcc7165e876206c6$var$useAnimation(ref, isActive, onStart, onEnd) {
  let isActiveRef = (0, import_react52.useRef)(null);
  let start = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(onStart);
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (isActive && ref.current && isActiveRef.current !== isActive) {
      isActiveRef.current = isActive;
      if (!("getAnimations" in ref.current)) {
        onEnd();
        return;
      }
      let startPromise = start?.(ref.current);
      let animations = ref.current.getAnimations().filter((a) => (typeof DocumentTimeline === "undefined" || a.timeline instanceof DocumentTimeline) && a.playState === "running");
      if (animations.length === 0 && !startPromise) {
        onEnd();
        return;
      }
      Promise.all([
        startPromise,
        ...animations.map((a) => a.finished)
      ]).then(() => {
        (0, import_react_dom6.flushSync)(() => {
          onEnd();
        });
      }).catch(() => {
      });
    }
    isActiveRef.current = isActive;
  }, [
    ref,
    isActive,
    onEnd
  ]);
}

// node_modules/react-aria/dist/private/dialog/useDialog.mjs
var import_react53 = require("react");
function $13150e6629d46e45$export$d55e7ee900f34e93(props, ref) {
  let { role = "dialog", isEntering } = props;
  let titleId = (0, $390e54f620492c70$export$b4cc09c592e8fdb8)();
  titleId = props["aria-label"] ? void 0 : titleId;
  let contentId = (0, $390e54f620492c70$export$b4cc09c592e8fdb8)();
  contentId = role === "alertdialog" && !props["aria-describedby"] ? contentId : void 0;
  let isRefocusing = (0, import_react53.useRef)(false);
  (0, import_react53.useEffect)(() => {
    if (!isEntering && ref.current && !(0, $23f2114a1b82827e$export$b4f377a2b6254582)(ref.current)) {
      (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
      let timeout = setTimeout(() => {
        if ((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() === ref.current || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() === document.body) {
          isRefocusing.current = true;
          if (ref.current) {
            ref.current.blur();
            (0, $f192c2f16961cbe0$export$80f3e147d781571c)(ref.current);
          }
          isRefocusing.current = false;
        }
      }, 500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [
    ref,
    isEntering
  ]);
  (0, $d7a937236970dc7f$export$14c98a7594375490)();
  let hasWarned = (0, import_react53.useRef)(false);
  (0, import_react53.useEffect)(() => {
    if (false) {
      let el = ref.current;
      let hasAriaLabel = el.hasAttribute("aria-label");
      let hasAriaLabelledby = el.hasAttribute("aria-labelledby");
      if (!hasAriaLabel && !hasAriaLabelledby) {
        console.warn("A dialog must have a title for accessibility. Either provide an aria-label or aria-labelledby prop, or render a heading element inside the dialog.");
        hasWarned.current = true;
      }
    }
  });
  let ariaDescribedby = props["aria-describedby"] ?? contentId;
  return {
    dialogProps: {
      ...(0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
        labelable: true
      }),
      role,
      tabIndex: -1,
      "aria-labelledby": props["aria-labelledby"] ?? titleId,
      "aria-describedby": ariaDescribedby,
      // Prevent blur events from reaching useOverlay, which may cause
      // popovers to close. Since focus is contained within the dialog,
      // we don't want this to occur due to the above useEffect.
      onBlur: (e) => {
        if (isRefocusing.current) e.stopPropagation();
      }
    },
    titleProps: {
      id: titleId
    },
    contentProps: {
      id: contentId
    }
  };
}

// node_modules/react-aria-components/dist/private/Dialog.mjs
var import_react54 = __toESM(require("react"), 1);
var $f2ff30fde7b014be$export$8b93a07348a7730c = /* @__PURE__ */ (0, import_react54.createContext)(null);
var $f2ff30fde7b014be$export$d2f961adcb0afbe = /* @__PURE__ */ (0, import_react54.createContext)(null);
var $f2ff30fde7b014be$export$3ddf2d174ce01153 = /* @__PURE__ */ (0, import_react54.forwardRef)(function Dialog(props, ref) {
  let originalAriaLabelledby = props["aria-labelledby"];
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $f2ff30fde7b014be$export$8b93a07348a7730c);
  let { dialogProps, titleProps, contentProps } = (0, $13150e6629d46e45$export$d55e7ee900f34e93)({
    ...props,
    // Only pass aria-labelledby from props, not context.
    // Context is used as a fallback below.
    "aria-labelledby": originalAriaLabelledby
  }, ref);
  let state = (0, import_react54.useContext)($f2ff30fde7b014be$export$d2f961adcb0afbe);
  if (!dialogProps["aria-label"] && !dialogProps["aria-labelledby"]) {
    if (props["aria-labelledby"]) dialogProps["aria-labelledby"] = props["aria-labelledby"];
    else if (false) console.warn('If a Dialog does not contain a <Heading slot="title">, it must have an aria-label or aria-labelledby attribute for accessibility.');
  }
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    defaultClassName: "react-aria-Dialog",
    className: props.className,
    style: props.style,
    children: props.children,
    values: {
      close: state?.close || (() => {
      })
    }
  });
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  return /* @__PURE__ */ (0, import_react54.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).section, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, dialogProps),
    render: props.render,
    ref,
    slot: props.slot || void 0
  }, /* @__PURE__ */ (0, import_react54.default).createElement((0, $7230ffa83bc0c2cf$export$2881499e37b75b9a), {
    values: [
      [
        (0, $2ec61d1d4f780267$export$d688439359537581),
        {
          slots: {
            [(0, $7230ffa83bc0c2cf$export$c62b8e45d58ddad9)]: {},
            title: {
              ...titleProps,
              level: 2
            }
          }
        }
      ],
      [
        (0, $efe09c6d1c304b50$export$9afb8bc826b033ea),
        {
          slots: {
            [(0, $7230ffa83bc0c2cf$export$c62b8e45d58ddad9)]: {},
            description: contentProps
          }
        }
      ],
      [
        (0, $7705c033048f6da7$export$24d547caef80ccd1),
        {
          slots: {
            [(0, $7230ffa83bc0c2cf$export$c62b8e45d58ddad9)]: {},
            close: {
              onPress: () => state?.close()
            }
          }
        }
      ]
    ]
  }, renderProps.children));
});

// node_modules/react-aria/dist/private/overlays/useModalOverlay.mjs
var import_react55 = require("react");
function $5698867baeb53f4e$export$dbc0f175b25fb0fb(props, state, ref) {
  let { overlayProps, underlayProps } = (0, $77844860df94ba23$export$ea8f71083e90600f)({
    ...props,
    isOpen: state.isOpen,
    onClose: state.close
  }, ref);
  (0, $0644e3663365bfe5$export$ee0f7cc6afcd1c18)({
    isDisabled: !state.isOpen,
    UNSTABLE_overrideFocus: props.UNSTABLE_overrideFocus
  });
  (0, $d7a937236970dc7f$export$14c98a7594375490)();
  let { isEntering } = props;
  (0, import_react55.useEffect)(() => {
    if (state.isOpen && ref.current) {
      if (isEntering)
        return (0, $58196c8d6a1f38fc$export$1020fa7f77e17884)(ref.current);
      return (0, $58196c8d6a1f38fc$export$1c3ebcada18427bf)([
        ref.current
      ], {
        shouldUseInert: true
      });
    }
  }, [
    state.isOpen,
    isEntering,
    ref
  ]);
  return {
    modalProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(overlayProps),
    underlayProps
  };
}

// node_modules/react-aria-components/dist/private/Modal.mjs
var import_react57 = __toESM(require("react"), 1);

// node_modules/react-aria/dist/private/utils/useViewportSize.mjs
var import_react56 = require("react");
var $6066a2c586ade9e1$var$visualViewport = typeof document !== "undefined" && window.visualViewport;
function $6066a2c586ade9e1$export$d699905dd57c73ca() {
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  let unmountRef = (0, import_react56.useRef)(null);
  let [size, setSize] = (0, import_react56.useState)(() => isSSR ? {
    width: 0,
    height: 0
  } : $6066a2c586ade9e1$var$getViewportSize());
  (0, import_react56.useEffect)(() => {
    let updateSize = (newSize) => {
      setSize((size2) => {
        if (newSize.width === size2.width && newSize.height === size2.height) return size2;
        return newSize;
      });
    };
    let onResize = () => {
      if ($6066a2c586ade9e1$var$visualViewport && $6066a2c586ade9e1$var$visualViewport.scale > 1) return;
      updateSize($6066a2c586ade9e1$var$getViewportSize());
    };
    let onBlur = (e) => {
      if ($6066a2c586ade9e1$var$visualViewport && $6066a2c586ade9e1$var$visualViewport.scale > 1) return;
      if (!(0, $bb39c0fc1c19b34c$export$c57958e35f31ed73)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e))) return;
      unmountRef.current = (0, $e0a0e4399f316b76$export$b80f73f72d03c10f)((isOpen) => {
        if (isOpen) return;
        updateSize({
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight
        });
      });
    };
    updateSize($6066a2c586ade9e1$var$getViewportSize());
    if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) window.addEventListener("blur", onBlur, true);
    if (!$6066a2c586ade9e1$var$visualViewport) window.addEventListener("resize", onResize);
    else $6066a2c586ade9e1$var$visualViewport.addEventListener("resize", onResize);
    return () => {
      unmountRef.current?.();
      if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) window.removeEventListener("blur", onBlur, true);
      if (!$6066a2c586ade9e1$var$visualViewport) window.removeEventListener("resize", onResize);
      else $6066a2c586ade9e1$var$visualViewport.removeEventListener("resize", onResize);
    };
  }, []);
  return size;
}
function $6066a2c586ade9e1$var$getViewportSize() {
  return {
    // Multiply by the visualViewport scale to get the "natural" size, unaffected by pinch zooming.
    width: $6066a2c586ade9e1$var$visualViewport ? (
      // the visual viewport and the document element to ensure that the scrollbar width is always excluded.
      // See: https://github.com/w3c/csswg-drafts/issues/8099
      Math.min($6066a2c586ade9e1$var$visualViewport.width * $6066a2c586ade9e1$var$visualViewport.scale, document.documentElement.clientWidth)
    ) : document.documentElement.clientWidth,
    height: $6066a2c586ade9e1$var$visualViewport ? $6066a2c586ade9e1$var$visualViewport.height * $6066a2c586ade9e1$var$visualViewport.scale : document.documentElement.clientHeight
  };
}

// node_modules/react-aria-components/dist/private/Modal.mjs
var $8b8d26808cb8cb53$export$ab57792b9b6974a6 = /* @__PURE__ */ (0, import_react57.createContext)(null);
var $8b8d26808cb8cb53$export$6bc057cefccad9c8 = /* @__PURE__ */ (0, import_react57.createContext)(null);
var $8b8d26808cb8cb53$export$2b77a92f1a5ad772 = /* @__PURE__ */ (0, import_react57.forwardRef)(function Modal(props, ref) {
  let ctx = (0, import_react57.useContext)($8b8d26808cb8cb53$export$6bc057cefccad9c8);
  if (ctx) {
    if (false) {
      const invalidSet = /* @__PURE__ */ new Set([
        "isDismissable",
        "isKeyboardDismissDisabled",
        "isOpen",
        "defaultOpen",
        "onOpenChange",
        "isEntering",
        "isExiting",
        "UNSTABLE_portalContainer",
        "shouldCloseOnInteractOutside"
      ]);
      const invalidProps = Object.keys(props).filter((key) => invalidSet.has(key));
      console.warn(`This modal is already wrapped in a ModalOverlay, props [${invalidProps.join(", ")}] should be placed on the ModalOverlay instead.`);
    }
    return /* @__PURE__ */ (0, import_react57.default).createElement($8b8d26808cb8cb53$var$ModalContent, {
      ...props,
      modalRef: ref
    }, props.children);
  }
  let { isDismissable, isKeyboardDismissDisabled, isOpen, defaultOpen, onOpenChange, children, isEntering, isExiting, UNSTABLE_portalContainer, shouldCloseOnInteractOutside, ...otherProps } = props;
  return /* @__PURE__ */ (0, import_react57.default).createElement($8b8d26808cb8cb53$export$8948f78d83984c69, {
    isDismissable,
    isKeyboardDismissDisabled,
    isOpen,
    defaultOpen,
    onOpenChange,
    isEntering,
    isExiting,
    UNSTABLE_portalContainer,
    shouldCloseOnInteractOutside
  }, /* @__PURE__ */ (0, import_react57.default).createElement($8b8d26808cb8cb53$var$ModalContent, {
    ...otherProps,
    modalRef: ref
  }, children));
});
function $8b8d26808cb8cb53$var$ModalOverlayWithForwardRef(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $8b8d26808cb8cb53$export$ab57792b9b6974a6);
  let contextState = (0, import_react57.useContext)((0, $f2ff30fde7b014be$export$d2f961adcb0afbe));
  let localState = (0, $f11fb0bcf1b2687a$export$61c6a8c84e605fb6)(props);
  let state = props.isOpen != null || props.defaultOpen != null || !contextState ? localState : contextState;
  if (state === contextState) {
    if (false) console.warn("This modals state is controlled by a trigger, place onOpenChange on the trigger instead.");
  }
  let objectRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
  let modalRef = (0, import_react57.useRef)(null);
  let isOverlayExiting = (0, $fcc7165e876206c6$export$45fda7c47f93fd48)(objectRef, state.isOpen, props.onExit);
  let onExitRef = (0, import_react57.useRef)(null);
  let isModalExiting = (0, $fcc7165e876206c6$export$45fda7c47f93fd48)(modalRef, state.isOpen, (element) => onExitRef.current?.(element));
  let isExiting = isOverlayExiting || isModalExiting || props.isExiting || false;
  let isSSR = (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)();
  if (!state.isOpen && !isExiting || isSSR) return null;
  return /* @__PURE__ */ (0, import_react57.default).createElement($8b8d26808cb8cb53$var$ModalOverlayInner, {
    ...props,
    state,
    isExiting,
    overlayRef: objectRef,
    modalRef,
    onExitRef
  });
}
var $8b8d26808cb8cb53$export$8948f78d83984c69 = /* @__PURE__ */ (0, import_react57.forwardRef)($8b8d26808cb8cb53$var$ModalOverlayWithForwardRef);
function $8b8d26808cb8cb53$var$ModalOverlayInner({ UNSTABLE_portalContainer, UNSTABLE_deferUntilEntered, ...props }) {
  let modalRef = props.modalRef;
  let { state } = props;
  let [isOpen, setIsOpen] = (0, import_react57.useState)(false);
  let entering = (0, $fcc7165e876206c6$export$6d3443f2c48bfc20)(props.overlayRef, isOpen, props.onEnter) || props.isEntering || false;
  let isDeferred = !!UNSTABLE_deferUntilEntered && (!isOpen || entering);
  let { modalProps, underlayProps } = (0, $5698867baeb53f4e$export$dbc0f175b25fb0fb)({
    ...props,
    isEntering: isDeferred
  }, state, modalRef);
  let dialogContext = (0, import_react57.useContext)((0, $f2ff30fde7b014be$export$8b93a07348a7730c));
  let mergedDialogContext = UNSTABLE_deferUntilEntered ? $8b8d26808cb8cb53$var$mergeDialogContext(dialogContext, {
    isEntering: isDeferred
  }) : dialogContext;
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-ModalOverlay",
    values: {
      isEntering: entering,
      isExiting: props.isExiting,
      state
    }
  });
  let viewport = (0, $6066a2c586ade9e1$export$d699905dd57c73ca)();
  let pageWidth = void 0;
  let pageHeight = void 0;
  if (typeof document !== "undefined") {
    let scrollingElement = (0, $901761b40e390936$export$2bb74740c4e19def)(document.body) ? document.body : document.scrollingElement || document.documentElement;
    let fractionalWidthDifference = scrollingElement.getBoundingClientRect().width % 1;
    let fractionalHeightDifference = scrollingElement.getBoundingClientRect().height % 1;
    pageWidth = scrollingElement.scrollWidth - fractionalWidthDifference;
    pageHeight = scrollingElement.scrollHeight - fractionalHeightDifference;
  }
  let style = {
    ...renderProps.style,
    "--visual-viewport-width": viewport.width + "px",
    "--visual-viewport-height": viewport.height + "px",
    "--page-width": pageWidth !== void 0 ? pageWidth + "px" : void 0,
    "--page-height": pageHeight !== void 0 ? pageHeight + "px" : void 0
  };
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => (0, $e0a0e4399f316b76$export$b80f73f72d03c10f)(() => setIsOpen(true)), []);
  return /* @__PURE__ */ (0, import_react57.default).createElement((0, $d7a937236970dc7f$export$c6fdb837b070b4ff), {
    isExiting: props.isExiting,
    portalContainer: UNSTABLE_portalContainer
  }, /* @__PURE__ */ (0, import_react57.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)((0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
      global: true
    }), underlayProps),
    ...renderProps,
    style,
    ref: props.overlayRef,
    "data-entering": entering || void 0,
    "data-exiting": props.isExiting || void 0
  }, /* @__PURE__ */ (0, import_react57.default).createElement((0, $7230ffa83bc0c2cf$export$2881499e37b75b9a), {
    values: [
      [
        $8b8d26808cb8cb53$export$6bc057cefccad9c8,
        {
          modalProps,
          modalRef,
          isExiting: props.isExiting,
          onExitRef: props.onExitRef,
          isOpen,
          isDismissable: props.isDismissable
        }
      ],
      [
        (0, $f2ff30fde7b014be$export$d2f961adcb0afbe),
        state
      ],
      [
        (0, $f2ff30fde7b014be$export$8b93a07348a7730c),
        mergedDialogContext
      ]
    ]
  }, renderProps.children)));
}
function $8b8d26808cb8cb53$var$mergeDialogContext(context, props) {
  if (context && "slots" in context && context.slots) {
    let slots = {};
    for (let key in context.slots) slots[key] = {
      ...context.slots[key],
      ...props
    };
    return {
      ...context,
      slots
    };
  }
  return {
    ...context,
    ...props
  };
}
function $8b8d26808cb8cb53$var$ModalContent(props) {
  let { modalProps, modalRef, isExiting, onExitRef, isDismissable, isOpen } = (0, import_react57.useContext)($8b8d26808cb8cb53$export$6bc057cefccad9c8);
  let state = (0, import_react57.useContext)((0, $f2ff30fde7b014be$export$d2f961adcb0afbe));
  let mergedRefs = (0, import_react57.useMemo)(() => (0, $4064df0d6f9620e1$export$c9058316764c140e)(props.modalRef, modalRef), [
    props.modalRef,
    modalRef
  ]);
  let ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(mergedRefs);
  let entering = (0, $fcc7165e876206c6$export$6d3443f2c48bfc20)(ref, isOpen, props.onEnter);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-Modal",
    values: {
      isEntering: entering,
      isExiting,
      state
    }
  });
  (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
    if (onExitRef) onExitRef.current = props.onExit;
  });
  return /* @__PURE__ */ (0, import_react57.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)((0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
      global: true
    }), modalProps),
    ...renderProps,
    ref,
    "data-entering": entering || void 0,
    "data-exiting": isExiting || void 0
  }, isDismissable && /* @__PURE__ */ (0, import_react57.default).createElement((0, $081058010ef8962e$export$2317d149ed6f78c4), {
    onDismiss: state.close
  }), renderProps.children);
}

// node_modules/react-aria/dist/private/tabs/utils.mjs
var $a251981b23baaa12$export$c5f62239608282b6 = /* @__PURE__ */ new WeakMap();
function $a251981b23baaa12$export$567fc7097e064344(state, key, role) {
  if (!state)
    return "";
  if (typeof key === "string") key = key.replace(/\s+/g, "");
  let baseId = $a251981b23baaa12$export$c5f62239608282b6.get(state);
  if (false) console.error("There is no tab id, please check if you have rendered the tab panel before the tab list.");
  return `${baseId}-${role}-${key}`;
}

// node_modules/react-aria/dist/private/tabs/useTab.mjs
function $1b6fa05bad3d7740$export$fdf4756d5b8ef90a(props, state, ref) {
  let { key, isDisabled: propsDisabled, shouldSelectOnPressUp } = props;
  let { selectionManager: manager, selectedKey } = state;
  let isSelected = key === selectedKey;
  let isDisabled = propsDisabled || state.isDisabled || state.selectionManager.isDisabled(key);
  let item = state.collection.getItem(key);
  let { itemProps, isPressed } = (0, $f6ba6936bfd098a0$export$ecf600387e221c37)({
    selectionManager: manager,
    key,
    ref,
    isDisabled,
    // Link tabs should behave like native anchors (navigate on press up)
    // This avoids reopening beforeunload dialogs when browsers replay
    // queued pointer enter/leave events after cancellation.
    shouldSelectOnPressUp: shouldSelectOnPressUp ?? item?.props.href != null,
    linkBehavior: "selection"
  });
  let tabId = (0, $a251981b23baaa12$export$567fc7097e064344)(state, key, "tab");
  let tabPanelId = (0, $a251981b23baaa12$export$567fc7097e064344)(state, key, "tabpanel");
  let { tabIndex } = itemProps;
  let domProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(item?.props, {
    labelable: true
  });
  delete domProps.id;
  let linkProps = (0, $caaf0dd3060ed57c$export$7e924b3091a3bd18)(item?.props);
  let { focusableProps } = (0, $d1116acdf220c2da$export$4c014de7c8940b4c)({
    ...item?.props,
    isDisabled
  }, ref);
  return {
    tabProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, focusableProps, linkProps, itemProps, {
      id: tabId,
      "aria-selected": isSelected,
      "aria-disabled": isDisabled || void 0,
      "aria-controls": isSelected ? tabPanelId : void 0,
      tabIndex: isDisabled ? void 0 : tabIndex,
      role: "tab"
    }),
    isSelected,
    isDisabled,
    isPressed
  };
}

// node_modules/react-aria/dist/private/tabs/TabsKeyboardDelegate.mjs
var $a226bee26c88efd7$export$15010ca3c1abe90b = class {
  constructor(collection, direction, orientation, disabledKeys = /* @__PURE__ */ new Set()) {
    this.collection = collection;
    this.flipDirection = direction === "rtl";
    this.disabledKeys = disabledKeys;
    this.tabDirection = orientation === "horizontal";
  }
  getKeyLeftOf(key) {
    if (this.flipDirection) return this.getNextKey(key);
    return this.getPreviousKey(key);
  }
  getKeyRightOf(key) {
    if (this.flipDirection) return this.getPreviousKey(key);
    return this.getNextKey(key);
  }
  isDisabled(key) {
    return this.disabledKeys.has(key) || !!this.collection.getItem(key)?.props?.isDisabled;
  }
  getFirstKey() {
    let key = this.collection.getFirstKey();
    if (key != null && this.isDisabled(key)) key = this.getNextKey(key);
    return key;
  }
  getLastKey() {
    let key = this.collection.getLastKey();
    if (key != null && this.isDisabled(key)) key = this.getPreviousKey(key);
    return key;
  }
  getKeyAbove(key) {
    if (this.tabDirection) return null;
    return this.getPreviousKey(key);
  }
  getKeyBelow(key) {
    if (this.tabDirection) return null;
    return this.getNextKey(key);
  }
  getNextKey(startKey) {
    let key = startKey;
    do {
      key = this.collection.getKeyAfter(key);
      if (key == null) key = this.collection.getFirstKey();
    } while (key != null && this.isDisabled(key) && key !== startKey);
    return key;
  }
  getPreviousKey(startKey) {
    let key = startKey;
    do {
      key = this.collection.getKeyBefore(key);
      if (key == null) key = this.collection.getLastKey();
    } while (key != null && this.isDisabled(key) && key !== startKey);
    return key;
  }
};

// node_modules/react-aria/dist/private/tabs/useTabList.mjs
var import_react58 = require("react");
function $83428e53deb13caf$export$773e389e644c5874(props, state, ref) {
  let { orientation = "horizontal", keyboardActivation = "automatic" } = props;
  let { collection, selectionManager: manager, disabledKeys } = state;
  let { direction } = (0, $2eb8e6d23f3d0cb0$export$43bb16f9c6d9e3f7)();
  let delegate = (0, import_react58.useMemo)(() => new (0, $a226bee26c88efd7$export$15010ca3c1abe90b)(collection, direction, orientation, disabledKeys), [
    collection,
    disabledKeys,
    orientation,
    direction
  ]);
  let { collectionProps } = (0, $d667c2af82d35a98$export$d6daf82dcd84e87c)({
    ref,
    selectionManager: manager,
    keyboardDelegate: delegate,
    selectOnFocus: keyboardActivation === "automatic",
    disallowEmptySelection: true,
    scrollRef: ref,
    linkBehavior: "selection"
  });
  let tabsId = (0, $390e54f620492c70$export$f680877a34711e37)();
  (0, $a251981b23baaa12$export$c5f62239608282b6).set(state, tabsId);
  let tabListLabelProps = (0, $e8ac3c3f5d4bae7f$export$d6875122194c7b44)({
    ...props,
    id: tabsId
  });
  return {
    tabListProps: {
      ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(collectionProps, tabListLabelProps),
      role: "tablist",
      "aria-orientation": orientation,
      tabIndex: void 0
    }
  };
}

// node_modules/react-aria-components/dist/private/Tabs.mjs
var import_react61 = __toESM(require("react"), 1);

// node_modules/react-stately/dist/private/list/useSingleSelectListState.mjs
var import_react59 = require("react");
function $0fdb127d377ffd84$export$e7f05e985daf4b5f(props) {
  let [selectedKey, setSelectedKey] = (0, $3e6197669829fe11$export$40bfa8c7b0832715)(props.selectedKey, props.defaultSelectedKey ?? null, props.onSelectionChange);
  let selectedKeys = (0, import_react59.useMemo)(() => selectedKey != null ? [
    selectedKey
  ] : [], [
    selectedKey
  ]);
  let { collection, disabledKeys, selectionManager } = (0, $b14b6f590b50af39$export$2f645645f7bca764)({
    ...props,
    selectionMode: "single",
    disallowEmptySelection: true,
    allowDuplicateSelectionEvents: true,
    selectedKeys,
    onSelectionChange: (keys) => {
      if (keys === "all") return;
      let key = keys.values().next().value ?? null;
      if (key === selectedKey && props.onSelectionChange) props.onSelectionChange(key);
      setSelectedKey(key);
    }
  });
  let selectedItem = selectedKey != null ? collection.getItem(selectedKey) : null;
  return {
    collection,
    disabledKeys,
    selectionManager,
    selectedKey,
    setSelectedKey,
    selectedItem
  };
}

// node_modules/react-stately/dist/private/tabs/useTabListState.mjs
var import_react60 = require("react");
function $caeb030f09a278a1$export$4ba071daf4e486(props) {
  let state = (0, $0fdb127d377ffd84$export$e7f05e985daf4b5f)({
    ...props,
    onSelectionChange: props.onSelectionChange ? (key) => {
      if (key != null) props.onSelectionChange?.(key);
    } : void 0,
    suppressTextValueWarning: true,
    defaultSelectedKey: props.defaultSelectedKey ?? $caeb030f09a278a1$var$findDefaultSelectedKey(props.collection, props.disabledKeys ? new Set(props.disabledKeys) : /* @__PURE__ */ new Set()) ?? void 0
  });
  let { selectionManager, collection, selectedKey: currentSelectedKey } = state;
  let lastSelectedKey = (0, import_react60.useRef)(currentSelectedKey);
  (0, import_react60.useEffect)(() => {
    let selectedKey = currentSelectedKey;
    if (props.selectedKey == null && (selectionManager.isEmpty || selectedKey == null || !collection.getItem(selectedKey))) {
      selectedKey = $caeb030f09a278a1$var$findDefaultSelectedKey(collection, state.disabledKeys);
      if (selectedKey != null)
        selectionManager.setSelectedKeys([
          selectedKey
        ]);
    }
    if (selectedKey != null && selectionManager.focusedKey == null || !selectionManager.isFocused && selectedKey !== lastSelectedKey.current) selectionManager.setFocusedKey(selectedKey);
    lastSelectedKey.current = selectedKey;
  });
  return {
    ...state,
    isDisabled: props.isDisabled || false
  };
}
function $caeb030f09a278a1$var$findDefaultSelectedKey(collection, disabledKeys) {
  let selectedKey = null;
  if (collection) {
    selectedKey = collection.getFirstKey();
    while (selectedKey != null && (disabledKeys.has(selectedKey) || collection.getItem(selectedKey)?.props?.isDisabled) && selectedKey !== collection.getLastKey()) selectedKey = collection.getKeyAfter(selectedKey);
    if (selectedKey != null && (disabledKeys.has(selectedKey) || collection.getItem(selectedKey)?.props?.isDisabled) && selectedKey === collection.getLastKey()) selectedKey = collection.getFirstKey();
  }
  return selectedKey;
}

// node_modules/react-aria-components/dist/private/Tabs.mjs
var $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f = /* @__PURE__ */ (0, import_react61.createContext)(null);
var $b4f18e3395fe64d7$export$364712098d2aa57c = /* @__PURE__ */ (0, import_react61.createContext)(null);
var $b4f18e3395fe64d7$export$b2539bed5023c21c = /* @__PURE__ */ (0, import_react61.forwardRef)(function Tabs(props, ref) {
  [props, ref] = (0, $7230ffa83bc0c2cf$export$29f1550f4b0d4415)(props, ref, $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f);
  let { children, orientation = "horizontal" } = props;
  children = (0, import_react61.useMemo)(() => typeof children === "function" ? children({
    orientation,
    defaultChildren: null
  }) : children, [
    children,
    orientation
  ]);
  return /* @__PURE__ */ (0, import_react61.default).createElement((0, $42ceafc619f9c3ba$export$bf788dd355e3a401), {
    content: children
  }, (collection) => /* @__PURE__ */ (0, import_react61.default).createElement($b4f18e3395fe64d7$var$TabsInner, {
    props,
    collection,
    tabsRef: ref
  }));
});
function $b4f18e3395fe64d7$var$TabsInner({ props, tabsRef: ref, collection }) {
  let { orientation = "horizontal" } = props;
  let state = (0, $caeb030f09a278a1$export$4ba071daf4e486)({
    ...props,
    collection,
    children: void 0
  });
  let { focusProps, isFocused, isFocusVisible } = (0, $0c4a58759813079a$export$4e328f61c538687f)({
    within: true
  });
  let values = (0, import_react61.useMemo)(() => ({
    orientation,
    isFocusWithin: isFocused,
    isFocusVisible
  }), [
    orientation,
    isFocused,
    isFocusVisible
  ]);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    defaultClassName: "react-aria-Tabs",
    values
  });
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  return /* @__PURE__ */ (0, import_react61.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, focusProps),
    ref,
    slot: props.slot || void 0,
    "data-focused": isFocused || void 0,
    "data-orientation": orientation,
    "data-focus-visible": isFocusVisible || void 0,
    "data-disabled": state.isDisabled || void 0
  }, /* @__PURE__ */ (0, import_react61.default).createElement((0, $7230ffa83bc0c2cf$export$2881499e37b75b9a), {
    values: [
      [
        $b4f18e3395fe64d7$export$cfa7aa87c26e7d1f,
        props
      ],
      [
        $b4f18e3395fe64d7$export$364712098d2aa57c,
        state
      ]
    ]
  }, renderProps.children));
}
var $b4f18e3395fe64d7$export$e51a686c67fdaa2d = /* @__PURE__ */ (0, import_react61.forwardRef)(function TabList(props, ref) {
  let state = (0, import_react61.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  return state ? /* @__PURE__ */ (0, import_react61.default).createElement($b4f18e3395fe64d7$var$TabListInner, {
    props,
    forwardedRef: ref
  }) : /* @__PURE__ */ (0, import_react61.default).createElement((0, $42ceafc619f9c3ba$export$fb8073518f34e6ec), props);
});
function $b4f18e3395fe64d7$var$TabListInner({ props, forwardedRef: ref }) {
  let state = (0, import_react61.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  let { CollectionRoot } = (0, import_react61.useContext)((0, $263ab7fc0f95ccdb$export$4feb769f8ddf26c5));
  let { orientation = "horizontal", keyboardActivation = "automatic" } = (0, $7230ffa83bc0c2cf$export$fabf2dc03a41866e)($b4f18e3395fe64d7$export$cfa7aa87c26e7d1f);
  let objectRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
  let { tabListProps } = (0, $83428e53deb13caf$export$773e389e644c5874)({
    ...props,
    orientation,
    keyboardActivation
  }, state, objectRef);
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    children: null,
    defaultClassName: "react-aria-TabList",
    values: {
      orientation,
      state
    }
  });
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  delete DOMProps.id;
  return /* @__PURE__ */ (0, import_react61.default).createElement((0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, tabListProps),
    ref: objectRef,
    "data-orientation": orientation || void 0
  }, /* @__PURE__ */ (0, import_react61.default).createElement((0, $792f28e438b9ad5f$export$758399f318e6385a), null, /* @__PURE__ */ (0, import_react61.default).createElement(CollectionRoot, {
    collection: state.collection,
    persistedKeys: (0, $263ab7fc0f95ccdb$export$90e00781bc59d8f9)(state.selectionManager.focusedKey)
  })));
}
var _$b4f18e3395fe64d7$var$TabItemNode = class _$b4f18e3395fe64d7$var$TabItemNode extends (0, $6f0c29017aeec335$export$d68d59712b04d9d1) {
};
_$b4f18e3395fe64d7$var$TabItemNode.type = "item";
var $b4f18e3395fe64d7$var$TabItemNode = _$b4f18e3395fe64d7$var$TabItemNode;
var $b4f18e3395fe64d7$export$3e41faf802a29e71 = /* @__PURE__ */ (0, $42ceafc619f9c3ba$export$18af5c7a9e9b3664)($b4f18e3395fe64d7$var$TabItemNode, (props, forwardedRef, item) => {
  let state = (0, import_react61.useContext)($b4f18e3395fe64d7$export$364712098d2aa57c);
  let ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(forwardedRef);
  let { tabProps, isSelected, isDisabled, isPressed } = (0, $1b6fa05bad3d7740$export$fdf4756d5b8ef90a)({
    key: item.key,
    ...props
  }, state, ref);
  let { focusProps, isFocused, isFocusVisible } = (0, $0c4a58759813079a$export$4e328f61c538687f)();
  let { hoverProps, isHovered } = (0, $e969f22b6713ca4a$export$ae780daf29e6d456)({
    isDisabled,
    onHoverStart: props.onHoverStart,
    onHoverEnd: props.onHoverEnd,
    onHoverChange: props.onHoverChange
  });
  let renderProps = (0, $7230ffa83bc0c2cf$export$4d86445c2cf5e3)({
    ...props,
    id: void 0,
    children: item.rendered,
    defaultClassName: "react-aria-Tab",
    values: {
      isSelected,
      isDisabled,
      isFocused,
      isFocusVisible,
      isPressed,
      isHovered
    }
  });
  let ElementType = item.props.href ? (0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).a : (0, $7230ffa83bc0c2cf$export$df3a06d6289f983e).div;
  let DOMProps = (0, $8e9d2fae0ecb9001$export$457c3d6518dd4c6f)(props, {
    global: true
  });
  delete DOMProps.id;
  delete DOMProps.onClick;
  return /* @__PURE__ */ (0, import_react61.default).createElement(ElementType, {
    ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(DOMProps, renderProps, tabProps, focusProps, hoverProps),
    ref,
    "data-selected": isSelected || void 0,
    "data-disabled": isDisabled || void 0,
    "data-focused": isFocused || void 0,
    "data-focus-visible": isFocusVisible || void 0,
    "data-pressed": isPressed || void 0,
    "data-hovered": isHovered || void 0
  }, /* @__PURE__ */ (0, import_react61.default).createElement((0, $91fe5e721c7f36c1$export$c9549807523555e0).Provider, {
    value: {
      isSelected
    }
  }, renderProps.children));
});

// client-src/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var EMPTY = { pages: 0, sheets: 0, slides: 0, assets: 0, files: 0 };
async function rpc(method, args = {}) {
  const response = await fetch("/dsh-space-api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, args })
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok || body?.error) {
    throw Object.assign(new Error(body?.error?.message || `\u8BF7\u6C42\u5931\u8D25 (${response.status})`), { code: body?.error?.code });
  }
  return body.result;
}
function Icon({ name: name2, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    space: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "3" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 9h18M9 9v11" })
    ] }),
    page: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 3h7l4 4v14H7z" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 3v5h4M10 13h5M10 17h5" })
    ] }),
    slides: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "12", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 20h8M12 16v4" })
    ] }),
    sheet: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 10h18M9 10v10M15 10v10M3 15h18" })
    ] }),
    file: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 3h7l4 4v14H7z" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 3v5h4" })
    ] }),
    plus: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" }) }),
    search: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "11", cy: "11", r: "7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16.5 16.5 21 21" })
    ] }),
    sync: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 12a8 8 0 0 1-13.6 5.7L4 15.7M4 12a8 8 0 0 1 13.6-5.7L20 8.3" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20v-5h5M20 4v5h-5" })
    ] }),
    alert: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3 2.5 20h19z" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 9v5M12 17.5v.1" })
    ] }),
    copy: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" })
    ] }),
    back: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m15 18-6-6 6-6" }) }),
    more: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "5", cy: "12", r: "1" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "1" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "19", cy: "12", r: "1" })
    ] })
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { ...common, children: paths[name2] || paths.file });
}
function ButtonBase({ variant = "default", className = "", onPress, onClick, isDisabled, ...props }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { ...props, onClick: onPress || onClick, disabled: isDisabled, className: `sp-btn sp-btn-${variant} ${className}` });
}
function SpaceIcon({ kind }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: kind === "slides" ? "slides" : kind === "table" ? "sheet" : kind === "image" || kind === "file" ? "file" : "page" });
}
function statusText(sync) {
  if (!sync) return "\u672A\u77E5";
  if (sync.state === "idle") return "\u5DF2\u540C\u6B65";
  if (sync.state === "syncing" || sync.state === "scanning") return "\u540C\u6B65\u4E2D";
  if (sync.state === "error") return "\u540C\u6B65\u9519\u8BEF";
  return sync.state || "\u672A\u77E5";
}
function App() {
  const [view, setView] = (0, import_react62.useState)({ kind: "home" });
  const [spaces, setSpaces] = (0, import_react62.useState)([]);
  const [loading, setLoading] = (0, import_react62.useState)(true);
  const [error, setError] = (0, import_react62.useState)("");
  const [filter, setFilter] = (0, import_react62.useState)("all");
  const [search, setSearch] = (0, import_react62.useState)("");
  const [space, setSpace] = (0, import_react62.useState)(null);
  const [tree, setTree] = (0, import_react62.useState)([]);
  const [expanded, setExpanded] = (0, import_react62.useState)(/* @__PURE__ */ new Set(["pages", "sheets", "assets", "files"]));
  const [node, setNode] = (0, import_react62.useState)(null);
  const [content, setContent] = (0, import_react62.useState)(null);
  const [contentLoading, setContentLoading] = (0, import_react62.useState)(false);
  const [mode, setMode] = (0, import_react62.useState)("preview");
  const [draft, setDraft] = (0, import_react62.useState)("");
  const [dirty, setDirty] = (0, import_react62.useState)(false);
  const [saving, setSaving] = (0, import_react62.useState)(false);
  const [sheetEdits, setSheetEdits] = (0, import_react62.useState)({});
  const [conflicts, setConflicts] = (0, import_react62.useState)([]);
  const [conflictOpen, setConflictOpen] = (0, import_react62.useState)(false);
  const [membersOpen, setMembersOpen] = (0, import_react62.useState)(false);
  const [syncOpen, setSyncOpen] = (0, import_react62.useState)(false);
  const [newContentOpen, setNewContentOpen] = (0, import_react62.useState)(false);
  const [newSpaceOpen, setNewSpaceOpen] = (0, import_react62.useState)(false);
  const [joinOpen, setJoinOpen] = (0, import_react62.useState)(false);
  const [inviteOpen, setInviteOpen] = (0, import_react62.useState)(false);
  const [invite, setInvite] = (0, import_react62.useState)(null);
  const [toast, setToast] = (0, import_react62.useState)("");
  const notify = (0, import_react62.useCallback)((text) => {
    setToast(text);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(""), 2600);
  }, []);
  const refreshSpaces = (0, import_react62.useCallback)(async () => {
    setLoading(true);
    setError("");
    try {
      setSpaces(await rpc("list", { filter }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);
  (0, import_react62.useEffect)(() => {
    refreshSpaces();
  }, [refreshSpaces]);
  const openSpace = (0, import_react62.useCallback)(async (id) => {
    setError("");
    setContent(null);
    setNode(null);
    setMode("preview");
    setDraft("");
    setDirty(false);
    setSheetEdits({});
    try {
      const [detail, treeResult, conflictList] = await Promise.all([
        rpc("get", { space: id }),
        rpc("tree", { space: id }),
        rpc("conflicts", { space: id }).catch(() => [])
      ]);
      setSpace(detail);
      setTree(treeResult.tree || []);
      setConflicts(conflictList || []);
      setView({ kind: "space", spaceId: id });
    } catch (e) {
      setError(e.message);
    }
  }, []);
  const openNode = (0, import_react62.useCallback)(async (entry) => {
    if (entry.type === "directory") {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.has(entry.path) ? next.delete(entry.path) : next.add(entry.path);
        return next;
      });
      return;
    }
    setNode(entry);
    setContentLoading(true);
    setError("");
    setMode("preview");
    setDirty(false);
    setSheetEdits({});
    try {
      const value = await rpc("read", { space: view.spaceId, path: entry.path });
      setContent(value);
      setDraft(value.text || "");
    } catch (e) {
      setError(e.message);
      setContent(null);
    } finally {
      setContentLoading(false);
    }
  }, [view]);
  const reloadConflicts = (0, import_react62.useCallback)(async () => {
    if (!view.spaceId) return [];
    const list = await rpc("conflicts", { space: view.spaceId }).catch(() => []);
    setConflicts(list);
    return list;
  }, [view]);
  const reloadSpaceMeta = (0, import_react62.useCallback)(async () => {
    if (!view.spaceId) return;
    const [treeResult, detail] = await Promise.all([
      rpc("tree", { space: view.spaceId }),
      rpc("get", { space: view.spaceId })
    ]);
    setTree(treeResult.tree || []);
    setSpace(detail);
  }, [view]);
  const reloadNode = (0, import_react62.useCallback)(async () => {
    if (!view.spaceId || !node) return;
    const value = await rpc("read", { space: view.spaceId, path: node.path });
    setContent(value);
    setDraft(value.text || "");
    setSheetEdits({});
    setDirty(false);
    return value;
  }, [view, node]);
  const changeMode = (0, import_react62.useCallback)((next) => {
    if (next === "edit") {
      setDraft(content?.text || "");
      setSheetEdits({});
      setDirty(false);
    }
    setMode(next);
  }, [content]);
  const changeCell = (0, import_react62.useCallback)((row, column, value) => {
    setSheetEdits((previous) => ({ ...previous, [`${row}:${column}`]: value }));
    setDirty(true);
  }, []);
  const saveContent = (0, import_react62.useCallback)(async () => {
    if (!view.spaceId || !node || !content) return;
    setSaving(true);
    setError("");
    try {
      if (content.kind === "table") {
        const edits = Object.entries(sheetEdits).map(([key, value]) => {
          const [row, column] = key.split(":").map(Number);
          return { row, column, value };
        });
        if (edits.length) {
          await rpc("editSheetCells", { space: view.spaceId, path: node.path, expectedSha256: content.sha256, edits });
        }
      } else {
        await rpc("write", { space: view.spaceId, path: node.path, content: draft, expectedSha256: content.sha256, overwrite: true });
      }
      await Promise.all([reloadNode(), reloadSpaceMeta(), reloadConflicts()]);
      setMode("preview");
      notify("\u5DF2\u4FDD\u5B58");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [view, node, content, sheetEdits, draft, reloadNode, reloadSpaceMeta, reloadConflicts, notify]);
  const discardContent = (0, import_react62.useCallback)(() => {
    setDraft(content?.text || "");
    setSheetEdits({});
    setDirty(false);
    setMode("preview");
  }, [content]);
  const addSheetRow = (0, import_react62.useCallback)(async () => {
    if (!view.spaceId || !node || !content) return;
    const columns = content.table?.columns || [];
    const row = columns.map(() => "");
    try {
      await rpc("updateSheet", { space: view.spaceId, path: node.path, rows: [row], mode: "append" });
      await Promise.all([reloadNode(), reloadSpaceMeta()]);
      setMode("edit");
      notify("\u5DF2\u6DFB\u52A0\u7A7A\u884C");
    } catch (e) {
      setError(e.message);
    }
  }, [view, node, content, reloadNode, reloadSpaceMeta, notify]);
  const createSpace = (0, import_react62.useCallback)(async (name2, description) => {
    const created = await rpc("createSpace", { name: name2, description });
    setNewSpaceOpen(false);
    await refreshSpaces();
    await openSpace(created.id);
    notify("\u7A7A\u95F4\u5DF2\u521B\u5EFA");
  }, [openSpace, refreshSpaces, notify]);
  const joinSpace = (0, import_react62.useCallback)(async (invite2) => {
    const joined = await rpc("join", { invite: invite2 });
    setJoinOpen(false);
    await refreshSpaces();
    if (joined?.space?.id) await openSpace(joined.space.id);
    notify("\u5DF2\u52A0\u5165\uFF0C\u7B49\u5F85\u5BF9\u65B9\u6279\u51C6\u8BBE\u5907");
  }, [openSpace, refreshSpaces, notify]);
  const createContent = (0, import_react62.useCallback)(async (kind, title, template) => {
    const args = { space: view.spaceId, title, template };
    if (kind === "doc") await rpc("createDoc", { ...args, parent: "pages", markdown: "" });
    if (kind === "slides") await rpc("createSlides", { ...args, parent: "pages" });
    if (kind === "sheet") await rpc("createSheet", { ...args, path: void 0 });
    setNewContentOpen(false);
    const [treeResult, detail] = await Promise.all([
      rpc("tree", { space: view.spaceId }),
      rpc("get", { space: view.spaceId })
    ]);
    setTree(treeResult.tree || []);
    setSpace(detail);
    setConflicts(await rpc("conflicts", { space: view.spaceId }).catch(() => []));
    notify("\u5185\u5BB9\u5DF2\u521B\u5EFA");
  }, [view, notify]);
  const showInvite = (0, import_react62.useCallback)(async () => {
    try {
      setInvite(await rpc("invite", { space: view.spaceId }));
      setInviteOpen(true);
    } catch (e) {
      setError(e.message);
    }
  }, [view]);
  const afterConflictResolved = (0, import_react62.useCallback)(async () => {
    const list = await reloadConflicts();
    await Promise.all([reloadSpaceMeta(), node ? reloadNode() : Promise.resolve()]);
    if (!list.length) setConflictOpen(false);
    notify("\u51B2\u7A81\u5DF2\u5904\u7406");
  }, [reloadConflicts, reloadSpaceMeta, reloadNode, node, notify]);
  const filtered = (0, import_react62.useMemo)(() => {
    const query = search.trim().toLowerCase();
    return spaces.filter((item) => !query || item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query));
  }, [spaces, search]);
  const counts = space?.stats?.counts || EMPTY;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: STYLE }),
    toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-toast", role: "status", children: toast }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-error", role: "alert", children: [
      error,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: () => setError(""), children: "\u5173\u95ED" })
    ] }),
    view.kind === "home" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Home,
      {
        spaces: filtered,
        loading,
        filter,
        setFilter,
        search,
        setSearch,
        onOpen: openSpace,
        onNewSpace: () => setNewSpaceOpen(true),
        onJoin: () => setJoinOpen(true),
        newSpaceOpen,
        setNewSpaceOpen,
        onCreate: createSpace
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      SpaceDetail,
      {
        space,
        tree,
        expanded,
        onOpen: openNode,
        activePath: node?.path,
        content,
        contentLoading,
        counts,
        conflicts,
        mode,
        draft,
        dirty,
        saving,
        sheetEdits,
        onModeChange: changeMode,
        onDraftChange: (value) => {
          setDraft(value);
          setDirty(true);
        },
        onCellChange: changeCell,
        onSave: saveContent,
        onDiscard: discardContent,
        onAddRow: addSheetRow,
        onBack: () => {
          setView({ kind: "home" });
          refreshSpaces();
        },
        onNewContent: () => setNewContentOpen(true),
        onInvite: showInvite,
        onMembers: () => setMembersOpen(true),
        onReviewConflicts: () => setConflictOpen(true),
        onSync: () => setSyncOpen(true)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewContentDialog, { open: newContentOpen, setOpen: setNewContentOpen, onCreate: createContent }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinDialog, { open: joinOpen, setOpen: setJoinOpen, onJoin: joinSpace }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InviteDialog, { open: inviteOpen, setOpen: setInviteOpen, invite, notify }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MembersDialog, { open: membersOpen, setOpen: setMembersOpen, space, notify }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConflictDialog, { open: conflictOpen, setOpen: setConflictOpen, space, conflicts, onResolved: afterConflictResolved, notify }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncDialog, { open: syncOpen, setOpen: setSyncOpen, space, notify })
  ] });
}
function Home({ spaces, loading, filter, setFilter, search, setSearch, onOpen, onNewSpace, onJoin, newSpaceOpen, setNewSpaceOpen, onCreate }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "sp-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Spaces" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-subtitle", children: "\u5F00\u653E\u6587\u672C\u7684\u5171\u4EAB\u7A7A\u95F4 \xB7 \u901A\u8FC7 Syncthing \u5728\u53EF\u4FE1\u8BBE\u5907\u95F4\u540C\u6B65" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { variant: "primary", onPress: onNewSpace, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus" }),
        " \u65B0\u5EFA\u7A7A\u95F4"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)($b4f18e3395fe64d7$export$b2539bed5023c21c, { selectedKey: filter, onSelectionChange: (key) => setFilter(String(key)), className: "sp-tabs", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($b4f18e3395fe64d7$export$e51a686c67fdaa2d, { "aria-label": "\u7A7A\u95F4\u7B5B\u9009", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)($b4f18e3395fe64d7$export$3e41faf802a29e71, { id: "all", children: "\u5168\u90E8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)($b4f18e3395fe64d7$export$3e41faf802a29e71, { id: "owned", children: "\u6211\u521B\u5EFA\u7684" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)($b4f18e3395fe64d7$export$3e41faf802a29e71, { id: "shared", children: "\u5171\u4EAB\u7ED9\u6211" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "search", size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "\u641C\u7D22\u7A7A\u95F4\u2026", "aria-label": "\u641C\u7D22\u7A7A\u95F4" })
      ] })
    ] }),
    loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-skeleton" }) : spaces.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "space", size: 42 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u8FD8\u6CA1\u6709\u7A7A\u95F4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u521B\u5EFA\u4E00\u4E2A\u7A7A\u95F4\uFF0C\u6216\u4F7F\u7528\u9080\u8BF7\u52A0\u5165\u4ED6\u4EBA\u7684\u7A7A\u95F4\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-empty-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { variant: "primary", onPress: onNewSpace, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus" }),
          " \u521B\u5EFA\u7B2C\u4E00\u4E2A\u7A7A\u95F4"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: onJoin, children: "\u7528\u9080\u8BF7\u52A0\u5165" })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-list", children: spaces.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "sp-row", onClick: () => onOpen(item.id), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "space", size: 22 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-row-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-row-title", children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-row-meta", children: [
          item.counts?.pages || 0,
          " \u9875\u9762 \xB7 ",
          item.counts?.sheets || 0,
          " \u8868\u683C \xB7 ",
          item.counts?.slides || 0,
          " \u5E7B\u706F\u7247",
          item.members ? ` \xB7 ${item.members} \u4F4D\u6210\u5458` : "",
          item.description ? ` \xB7 ${item.description}` : ""
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `sp-badge ${item.sync?.state === "idle" ? "ok" : "warn"}`, children: statusText(item.sync) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "back", size: 16 })
    ] }, item.id)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewSpaceDialog, { open: newSpaceOpen, setOpen: setNewSpaceOpen, onCreate })
  ] });
}
function SpaceDetail({ space, tree, expanded, onOpen, activePath, content, contentLoading, counts, conflicts, mode, draft, dirty, saving, sheetEdits, onModeChange, onDraftChange, onCellChange, onSave, onDiscard, onAddRow, onBack, onNewContent, onInvite, onMembers, onReviewConflicts, onSync }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-detail", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-detail-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { variant: "ghost", onPress: onBack, "aria-label": "\u8FD4\u56DE\u7A7A\u95F4\u5217\u8868", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "back" }),
        " \u5168\u90E8\u7A7A\u95F4"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-detail-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: space?.name || "\u7A7A\u95F4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: `sp-badge ${space?.sync?.state === "idle" ? "ok" : "warn"}`, onClick: onSync, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "sync", size: 12 }),
          " ",
          statusText(space?.sync)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-detail-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { onPress: onNewContent, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus" }),
          " \u65B0\u5EFA"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: onMembers, children: "\u6210\u5458" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: onInvite, children: "\u9080\u8BF7" })
      ] })
    ] }),
    conflicts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-conflict-banner", role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "alert", size: 16 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        conflicts.length,
        " \u4E2A\u6587\u4EF6\u6709\u540C\u6B65\u51B2\u7A81\uFF0C\u9700\u8981\u5904\u7406\u540E\u624D\u80FD\u7EE7\u7EED\u7F16\u8F91\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: onReviewConflicts, children: "\u5904\u7406\u51B2\u7A81" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-detail-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { className: "sp-tree", "aria-label": "\u7A7A\u95F4\u5185\u5BB9", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-tree-summary", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            counts.pages,
            " \u9875\u9762"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            counts.sheets,
            " \u8868\u683C"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            counts.slides,
            " \u5E7B\u706F\u7247"
          ] })
        ] }),
        tree.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "sp-tree-empty", children: [
          "\u7A7A\u95F4\u8FD8\u662F\u7A7A\u7684",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u70B9\u51FB\u201C\u65B0\u5EFA\u201D\u6DFB\u52A0\u6587\u6863\u3001\u8868\u683C\u6216\u5E7B\u706F\u7247\u3002" })
        ] }),
        tree.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeNode, { entry, depth: 0, expanded, onOpen, activePath }, entry.path))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", { className: "sp-content", children: contentLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-skeleton" }) : content ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        ContentPane,
        {
          content,
          path: activePath,
          mode,
          draft,
          dirty,
          saving,
          sheetEdits,
          onModeChange,
          onDraftChange,
          onCellChange,
          onSave,
          onDiscard,
          onAddRow
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-empty compact", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "page", size: 36 }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: tree.length ? "\u9009\u62E9\u4E00\u4E2A\u9875\u9762" : "\u8FD9\u4E2A\u7A7A\u95F4\u8FD8\u662F\u7A7A\u7684" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: tree.length ? "\u4ECE\u5DE6\u4FA7\u9009\u62E9 Page\u3001\u8868\u683C\u6216\u5E7B\u706F\u7247\u3002" : "\u65B0\u5EFA\u4E00\u4E2A Markdown \u6587\u6863\u3001CSV \u8868\u683C\u6216 Marp \u5E7B\u706F\u7247\u5F00\u59CB\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { variant: "primary", onPress: onNewContent, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus" }),
          " \u65B0\u5EFA\u5185\u5BB9"
        ] })
      ] }) })
    ] })
  ] });
}
function ContentPane({ content, path, mode, draft, dirty, saving, sheetEdits, onModeChange, onDraftChange, onCellChange, onSave, onDiscard, onAddRow }) {
  const preview = () => {
    if (dirty && !window.confirm("\u653E\u5F03\u672A\u4FDD\u5B58\u7684\u66F4\u6539\uFF1F")) return;
    onDiscard();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-content-inner", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-content-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-path", children: path }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-content-actions", children: [
        dirty && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-dirty", children: "\u672A\u4FDD\u5B58" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-seg", role: "group", "aria-label": "\u67E5\u770B\u6A21\u5F0F", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: mode === "preview" ? "active" : "", onClick: preview, children: "\u9884\u89C8" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: mode === "edit" ? "active" : "", onClick: () => onModeChange("edit"), children: "\u7F16\u8F91" })
        ] }),
        mode === "edit" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: onDiscard, children: "\u53D6\u6D88" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: saving || !dirty, onPress: onSave, children: saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58" })
        ] })
      ] })
    ] }),
    mode === "edit" ? content.kind === "table" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetEditor, { content, sheetEdits, onCellChange, onAddRow }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "sp-editor", value: draft, onChange: (event) => onDraftChange(event.target.value), spellCheck: false, "aria-label": "\u7F16\u8F91\u5185\u5BB9" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Preview, { content })
  ] });
}
function SheetEditor({ content, sheetEdits, onCellChange, onAddRow }) {
  const columns = content.table?.columns || [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-table-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "sp-table sp-table-edit", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: column.title }, column.key)) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: content.table.rows.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: columns.map((column, columnIndex) => {
        const key = `${rowIndex}:${columnIndex}`;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "sp-cell-input", value: sheetEdits[key] ?? row[columnIndex] ?? "", onChange: (event) => onCellChange(rowIndex, columnIndex, event.target.value), "aria-label": `${column.title} \u7B2C ${rowIndex + 1} \u884C` }) }, column.key);
      }) }, rowIndex)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-table-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "sp-muted", children: [
        content.table.rows.length,
        " / ",
        content.table.total,
        " \u884C"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ButtonBase, { onPress: onAddRow, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "plus", size: 14 }),
        " \u6DFB\u52A0\u7A7A\u884C"
      ] })
    ] })
  ] });
}
function TreeNode({ entry, depth, expanded, onOpen, activePath }) {
  const isDir = entry.type === "directory";
  const isOpen = expanded.has(entry.path);
  if (entry.name === ".stignore" || entry.name === ".space.json") return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        className: `sp-tree-row ${activePath === entry.path ? "active" : ""}`,
        style: { paddingLeft: 10 + depth * 14 },
        onClick: () => onOpen(entry),
        "aria-expanded": isDir ? isOpen : void 0,
        children: [
          isDir ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `sp-caret ${isOpen ? "open" : ""}`, children: "\u203A" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-caret-space" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaceIcon, { kind: entry.kind || (isDir ? "file" : "document") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-tree-label", children: entry.title || entry.name })
        ]
      }
    ),
    isDir && isOpen && entry.children?.map((child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeNode, { entry: child, depth: depth + 1, expanded, onOpen, activePath }, child.path))
  ] });
}
function Preview({ content }) {
  if (content.kind === "document") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", { className: "sp-doc", dangerouslySetInnerHTML: { __html: content.html } });
  }
  if (content.kind === "slides") {
    const srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}${content.css}</style></head><body>${content.html}</body></html>`;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", { className: "sp-slides", sandbox: "", title: "\u5E7B\u706F\u7247\u9884\u89C8", srcDoc: srcdoc });
  }
  if (content.kind === "table") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-table-wrap", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "sp-table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: content.table.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: column.title }, column.key)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: content.table.rows.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: row.map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: String(cell ?? "") }, cellIndex)) }, index)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "sp-muted", children: [
        content.table.rows.length,
        " / ",
        content.table.total,
        " \u884C"
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "sp-pre", children: content.text });
}
function MembersDialog({ open, setOpen, space, notify }) {
  const [data, setData] = (0, import_react62.useState)(null);
  const [invite, setInvite] = (0, import_react62.useState)(null);
  const [error, setError] = (0, import_react62.useState)("");
  const [busy, setBusy] = (0, import_react62.useState)("");
  const load = (0, import_react62.useCallback)(async () => {
    if (!space?.id) return;
    setError("");
    try {
      const [members, invitation] = await Promise.all([rpc("members", { space: space.id }), rpc("invite", { space: space.id })]);
      setData(members);
      setInvite(invitation);
    } catch (e) {
      setError(e.message);
    }
  }, [space]);
  (0, import_react62.useEffect)(() => {
    if (open) load();
  }, [open, load]);
  const approve = async (deviceId) => {
    setBusy(deviceId);
    setError("");
    try {
      await rpc("approve", { space: space.id, deviceId });
      await load();
      notify("\u8BBE\u5907\u5DF2\u6279\u51C6");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog sp-dialog-wide", "aria-label": "\u6210\u5458", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u6210\u5458\u4E0E\u8BBE\u5907" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u52A0\u5165\u7A7A\u95F4\u5373\u62E5\u6709\u5168\u90E8\u6587\u4EF6\u7684\u8BFB\u5199\u6743\u9650\uFF1B\u8BBE\u5907\u9700\u8981\u5728\u8FD9\u91CC\u6279\u51C6\u540E\u624D\u4F1A\u540C\u6B65\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "sp-section-title", children: "\u5DF2\u52A0\u5165" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-members", children: [
      (data?.members || []).map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-member", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `sp-dot ${member.connected ? "on" : ""}` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-member-name", children: [
          member.name,
          member.self ? "\uFF08\u672C\u673A\uFF09" : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-member-id", children: [
          member.deviceId.slice(0, 7),
          "\u2026"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-muted", children: member.self ? "\u672C\u673A" : member.connected ? "\u5DF2\u8FDE\u63A5" : "\u79BB\u7EBF" })
      ] }, member.deviceId)),
      !data?.members?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u8FD8\u6CA1\u6709\u6210\u5458\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "sp-section-title", children: "\u5F85\u6279\u51C6\u8BBE\u5907" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-members", children: [
      (data?.pending || []).map((device) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-member", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-dot" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "sp-member-name", children: device.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-member-id", children: [
          device.deviceId.slice(0, 7),
          "\u2026"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: busy === device.deviceId, onPress: () => approve(device.deviceId), children: busy === device.deviceId ? "\u6279\u51C6\u4E2D\u2026" : "\u6279\u51C6" })
      ] }, device.deviceId)),
      !data?.pending?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u6CA1\u6709\u5F85\u6279\u51C6\u8BBE\u5907\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "sp-section-title", children: "\u9080\u8BF7\u65B0\u8BBE\u5907" }),
    invite && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9080\u8BF7 token" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { readOnly: true, rows: 3, value: invite.invite })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: () => navigator.clipboard?.writeText(invite.invite).then(() => notify("\u9080\u8BF7\u5DF2\u590D\u5236")).catch(() => notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9")), children: "\u590D\u5236\u9080\u8BF7" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: () => navigator.clipboard?.writeText(invite.deviceId).then(() => notify("Device ID \u5DF2\u590D\u5236")).catch(() => notify("\u590D\u5236\u5931\u8D25")), children: "\u590D\u5236\u6211\u7684 Device ID" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", onPress: close, children: "\u5B8C\u6210" })
      ] })
    ] })
  ] }) }) });
}
function ConflictDialog({ open, setOpen, space, conflicts, onResolved, notify }) {
  const [selected, setSelected] = (0, import_react62.useState)(null);
  const [detail, setDetail] = (0, import_react62.useState)(null);
  const [merged, setMerged] = (0, import_react62.useState)("");
  const [error, setError] = (0, import_react62.useState)("");
  const [busy, setBusy] = (0, import_react62.useState)("");
  (0, import_react62.useEffect)(() => {
    if (!open) return;
    setMerged("");
    setSelected((prev) => conflicts.some((item) => item.conflictPath === prev) ? prev : conflicts[0]?.conflictPath || null);
  }, [open, conflicts]);
  (0, import_react62.useEffect)(() => {
    if (!open || !space?.id || !selected) {
      setDetail(null);
      return;
    }
    setError("");
    rpc("conflictDetail", { space: space.id, conflictPath: selected }).then(setDetail).catch((e) => setError(e.message));
  }, [open, space, selected]);
  const resolve = async (action) => {
    if (!space?.id || !selected) return;
    setBusy(action);
    setError("");
    try {
      const result = await rpc("resolveConflict", { space: space.id, conflictPath: selected, action });
      if (result.resolved) {
        await onResolved();
        notify("\u51B2\u7A81\u5DF2\u89E3\u51B3");
      } else {
        setMerged(result.text || "");
        setError("\u81EA\u52A8\u5408\u5E76\u4ECD\u6709\u51B2\u7A81\uFF0C\u8BF7\u624B\u52A8\u5904\u7406\u4E0B\u9762\u7684\u6587\u672C\u3002");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog sp-dialog-wide", "aria-label": "\u5904\u7406\u540C\u6B65\u51B2\u7A81", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u5904\u7406\u540C\u6B65\u51B2\u7A81" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u540C\u4E00\u4E2A\u6587\u4EF6\u5728\u4E24\u53F0\u8BBE\u5907\u4E0A\u88AB\u4FEE\u6539\u3002\u4FDD\u7559\u4E00\u4FA7\uFF0C\u6216\u8BA9\u5DE5\u5177\u505A\u4E09\u65B9\u5408\u5E76\uFF1B\u5408\u5E76\u540E\u4E0D\u4F1A\u518D\u81EA\u52A8\u8986\u76D6\u3002" }),
    !conflicts.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u6CA1\u6709\u5F85\u5904\u7406\u51B2\u7A81\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-conflict-layout", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-conflict-list", children: conflicts.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: `sp-conflict-item ${selected === item.conflictPath ? "active" : ""}`, onClick: () => setSelected(item.conflictPath), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.path }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: item.conflictPath.split("/").pop() })
      ] }, item.conflictPath)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-conflict-detail", children: [
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
        detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-conflict-cols", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u672C\u673A\u7248\u672C" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: detail.local || "\uFF08\u6587\u4EF6\u4E0D\u5B58\u5728\uFF09" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u5BF9\u7AEF\u7248\u672C" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: detail.remote })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "\u57FA\u7EBF" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: detail.base || "\uFF08\u6CA1\u6709\u57FA\u7EBF\uFF09" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { isDisabled: Boolean(busy), onPress: () => resolve("keep-local"), children: "\u4FDD\u7559\u672C\u673A" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { isDisabled: Boolean(busy), onPress: () => resolve("keep-conflict"), children: "\u4FDD\u7559\u5BF9\u7AEF" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: Boolean(busy), onPress: () => resolve("merge"), children: busy === "merge" ? "\u5408\u5E76\u4E2D\u2026" : "\u5C1D\u8BD5\u5408\u5E76" })
          ] }),
          merged && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "sp-pre sp-merged", children: merged })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u52A0\u8F7D\u51B2\u7A81\u5185\u5BB9\u2026" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-dialog-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: close, children: "\u5173\u95ED" }) })
  ] }) }) });
}
function SyncDialog({ open, setOpen, space, notify }) {
  const [info, setInfo] = (0, import_react62.useState)(null);
  const [error, setError] = (0, import_react62.useState)("");
  const [busy, setBusy] = (0, import_react62.useState)(false);
  const load = (0, import_react62.useCallback)(async () => {
    if (!space?.id) return;
    setError("");
    try {
      setInfo(await rpc("sync", { space: space.id }));
    } catch (e) {
      setError(e.message);
    }
  }, [space]);
  (0, import_react62.useEffect)(() => {
    if (open) load();
  }, [open, load]);
  const rescan = async () => {
    setBusy(true);
    setError("");
    try {
      await rpc("rescan", { space: space.id });
      await load();
      notify("\u5DF2\u89E6\u53D1\u626B\u63CF");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog", "aria-label": "\u540C\u6B65\u72B6\u6001", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u540C\u6B65\u72B6\u6001" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
    info ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-sync-summary", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `sp-badge ${info.state === "idle" ? "ok" : "warn"}`, children: statusText(info) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-muted", children: [
          "\u5F85\u540C\u6B65 ",
          info.needFiles || 0,
          " \u4E2A\u6587\u4EF6 \xB7 \u51B2\u7A81 ",
          info.conflicts || 0
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-members", children: [
        (info.peers || []).map((peer) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-member", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `sp-dot ${peer.connected ? "on" : ""}` }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-member-name", children: [
            peer.deviceId.slice(0, 7),
            "\u2026"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "sp-muted", children: [
            peer.connected ? "\u5DF2\u8FDE\u63A5" : "\u79BB\u7EBF",
            peer.completion != null ? ` \xB7 ${peer.completion}%` : ""
          ] })
        ] }, peer.deviceId)),
        !info.peers?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u8FD8\u6CA1\u6709\u5176\u4ED6\u8BBE\u5907\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { isDisabled: busy, onPress: rescan, children: busy ? "\u626B\u63CF\u4E2D\u2026" : "\u91CD\u65B0\u626B\u63CF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { onPress: close, children: "\u5173\u95ED" })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u8BFB\u53D6\u4E2D\u2026" })
  ] }) }) });
}
function NewSpaceDialog({ open, setOpen, onCreate }) {
  const [name2, setName] = (0, import_react62.useState)("");
  const [description, setDescription] = (0, import_react62.useState)("");
  const [busy, setBusy] = (0, import_react62.useState)(false);
  const [error, setError] = (0, import_react62.useState)("");
  const submit = async () => {
    if (!name2.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(name2.trim(), description.trim());
      setName("");
      setDescription("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog", "aria-label": "\u65B0\u5EFA\u7A7A\u95F4", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u65B0\u5EFA\u7A7A\u95F4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u7A7A\u95F4\u662F\u4E00\u4E2A Syncthing \u6587\u4EF6\u5939\uFF1B\u6240\u6709\u5185\u5BB9\u90FD\u662F\u53EF\u8BFB\u3001\u53EF diff \u7684\u5F00\u653E\u6587\u672C\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u540D\u79F0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { autoFocus: true, value: name2, onChange: (e) => setName(e.target.value), maxLength: 80, placeholder: "\u4F8B\u5982\uFF1AQ3 \u590D\u76D8" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "\u8FD9\u4E2A\u7A7A\u95F4\u7528\u6765\u505A\u4EC0\u4E48\uFF1F" })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: close, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: busy || !name2.trim(), onPress: submit, children: busy ? "\u521B\u5EFA\u4E2D\u2026" : "\u521B\u5EFA" })
    ] })
  ] }) }) });
}
function NewContentDialog({ open, setOpen, onCreate }) {
  const [kind, setKind] = (0, import_react62.useState)("doc");
  const [title, setTitle] = (0, import_react62.useState)("");
  const [template, setTemplate] = (0, import_react62.useState)("blank");
  const [busy, setBusy] = (0, import_react62.useState)(false);
  const [error, setError] = (0, import_react62.useState)("");
  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(kind, title.trim(), template);
      setTitle("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog", "aria-label": "\u65B0\u5EFA\u5185\u5BB9", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u65B0\u5EFA\u5185\u5BB9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "sp-type-grid", children: [["doc", "\u6587\u6863", "page"], ["slides", "\u5E7B\u706F\u7247", "slides"], ["sheet", "\u8868\u683C", "sheet"]].map(([value, label, icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: `sp-type ${kind === value ? "active" : ""}`, onClick: () => setKind(value), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: icon, size: 22 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })
    ] }, value)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6807\u9898" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u9879\u76EE\u6982\u89C8" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u6A21\u677F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: template, onChange: (e) => setTemplate(e.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "blank", children: "\u7A7A\u767D" }),
        kind === "doc" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "project-brief", children: "\u9879\u76EE\u7B80\u62A5" }),
        kind === "doc" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "meeting-notes", children: "\u4F1A\u8BAE\u7EAA\u8981" }),
        kind === "slides" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "review", children: "\u590D\u76D8" }),
        kind === "slides" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "pitch", children: "Pitch" }),
        kind === "sheet" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "tracker", children: "Tracker" }),
        kind === "sheet" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "budget", children: "\u9884\u7B97" })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: close, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: busy || !title.trim(), onPress: submit, children: busy ? "\u521B\u5EFA\u4E2D\u2026" : "\u521B\u5EFA" })
    ] })
  ] }) }) });
}
function JoinDialog({ open, setOpen, onJoin }) {
  const [invite, setInvite] = (0, import_react62.useState)("");
  const [busy, setBusy] = (0, import_react62.useState)(false);
  const [error, setError] = (0, import_react62.useState)("");
  const submit = async () => {
    if (!invite.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onJoin(invite.trim());
      setInvite("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog", "aria-label": "\u7528\u9080\u8BF7\u52A0\u5165", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: "\u7528\u9080\u8BF7\u52A0\u5165\u7A7A\u95F4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u7C98\u8D34\u5BF9\u65B9\u5206\u4EAB\u7684 `dshspace:v1:...` token\u3002\u52A0\u5165\u540E\uFF0C\u5BF9\u65B9\u8FD8\u9700\u8981\u6279\u51C6\u4F60\u7684\u8BBE\u5907\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9080\u8BF7 token" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { autoFocus: true, rows: 4, value: invite, onChange: (e) => setInvite(e.target.value), placeholder: "dshspace:v1:..." })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-form-error", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: close, children: "\u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", isDisabled: busy || !invite.trim(), onPress: submit, children: busy ? "\u52A0\u5165\u4E2D\u2026" : "\u52A0\u5165" })
    ] })
  ] }) }) });
}
function InviteDialog({ open, setOpen, invite, notify }) {
  if (!invite) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)($8b8d26808cb8cb53$export$2b77a92f1a5ad772, { isOpen: open, onOpenChange: setOpen, className: "sp-modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)($f2ff30fde7b014be$export$3ddf2d174ce01153, { className: "sp-dialog sp-invite-dialog", "aria-label": "\u9080\u8BF7\u6210\u5458", children: ({ close }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)($2ec61d1d4f780267$export$a8a3e93435678ff9, { slot: "title", children: [
      "\u9080\u8BF7\u5230\u300C",
      invite.space?.name,
      "\u300D"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "sp-muted", children: "\u5BF9\u65B9\u5B89\u88C5 DSH Space \u540E\uFF0C\u5728\u5DE5\u5177\u6216\u9875\u9762\u91CC\u4F7F\u7528\u4E0B\u9762\u7684\u9080\u8BF7 token \u52A0\u5165\uFF1B\u4F60\u8FD8\u9700\u8981\u5728\u8FD9\u91CC\u6279\u51C6\u5BF9\u65B9\u7684\u8BBE\u5907\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u9080\u8BF7 token" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { readOnly: true, value: invite.invite, rows: 3 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "sp-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u4F60\u7684 Device ID" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { readOnly: true, value: invite.deviceId })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "sp-dialog-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "ghost", onPress: () => navigator.clipboard?.writeText(invite.invite).then(() => notify("\u9080\u8BF7\u5DF2\u590D\u5236")).catch(() => notify("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9")), children: "\u590D\u5236\u9080\u8BF7" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ButtonBase, { variant: "primary", onPress: close, children: "\u5B8C\u6210" })
    ] })
  ] }) }) });
}
var STYLE = `
.sp-root{height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:14px/1.5 inherit;position:relative;overflow:hidden}
.sp-page{max-width:1040px;margin:0 auto;padding:clamp(24px,4vw,48px);box-sizing:border-box;height:100%;overflow:auto}
.sp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:28px}
.sp-header h1{margin:0;font-size:28px;line-height:1.2;font-weight:650}
.sp-subtitle{margin:6px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px}
.sp-toolbar{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:16px}
.sp-tabs{flex:0 0 auto}
.sp-tabs [role="tablist"]{display:flex;gap:4px;padding:3px;background:var(--dsw-alias-bg-layer-2);border-radius:9px}
.sp-tabs [role="tab"]{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 12px;border-radius:7px;font:inherit;cursor:pointer}
.sp-tabs [role="tab"][data-selected]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.08)}
.sp-search{display:flex;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:9px;padding:0 10px;height:34px;color:var(--dsw-alias-label-secondary);min-width:220px}
.sp-search input{border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;width:100%}
.sp-list{display:flex;flex-direction:column;gap:8px}
.sp-row{display:flex;align-items:center;gap:14px;text-align:left;width:100%;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:11px;color:inherit;cursor:pointer;font:inherit}
.sp-row:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.sp-row-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);flex:0 0 auto}
.sp-row-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.sp-row-title{font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-row-meta{color:var(--dsw-alias-label-secondary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-badge{font-size:11px;padding:3px 8px;border-radius:999px;white-space:nowrap;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.sp-badge.ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 35%,transparent)}
.sp-badge.warn{color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 35%,transparent)}
.sp-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;height:34px;font:inherit;cursor:pointer;white-space:nowrap}
.sp-btn:hover{border-color:var(--dsw-alias-border-l2)}
.sp-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.sp-btn-ghost{background:transparent;border-color:transparent;padding-left:6px;padding-right:6px}
.sp-btn[disabled]{opacity:.5;cursor:not-allowed}
.sp-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:80px 24px;color:var(--dsw-alias-label-secondary);border:1px dashed var(--dsw-alias-border-l1);border-radius:14px}
.sp-empty h2{margin:8px 0 0;font-size:18px;color:var(--dsw-alias-label-primary)}
.sp-empty p{margin:0 0 12px;max-width:440px}
.sp-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.sp-empty.compact{padding:48px 24px;border:0}
.sp-skeleton{height:220px;border-radius:14px;background:linear-gradient(90deg,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2));background-size:200% 100%;animation:sp-shimmer 1.4s infinite}
@keyframes sp-shimmer{to{background-position:-200% 0}}
.sp-detail{display:flex;flex-direction:column;height:100%;min-height:0}
.sp-detail-head{display:flex;align-items:center;gap:14px;padding:18px clamp(20px,3vw,36px);border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.sp-detail-title{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.sp-detail-title h1{margin:0;font-size:22px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-detail-actions{display:flex;gap:8px}
.sp-detail-body{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:0;flex:1}
.sp-tree{border-right:1px solid var(--dsw-alias-border-l1);padding:12px 8px 24px;overflow:auto;background:var(--dsw-specific-sidebar-fill)}
.sp-tree-summary{display:flex;gap:10px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;padding:4px 10px 10px}
.sp-tree-row{display:flex;align-items:center;gap:7px;width:100%;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;padding:6px 10px;border-radius:7px;cursor:pointer;text-align:left}
.sp-tree-row:hover{background:var(--dsw-alias-bg-layer-2)}
.sp-tree-row.active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary)}
.sp-tree-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.sp-caret{display:inline-block;width:10px;color:var(--dsw-alias-label-secondary);transition:transform .12s;flex:0 0 10px}
.sp-caret.open{transform:rotate(90deg)}
.sp-caret-space{width:10px;flex:0 0 10px}
.sp-content{overflow:auto;padding:clamp(20px,3vw,36px);min-width:0}
.sp-doc{max-width:780px;margin:0 auto;line-height:1.7}
.sp-doc h1{font-size:26px;margin:0 0 .6em}
.sp-doc h2{font-size:20px;margin:1.4em 0 .5em}
.sp-doc h3{font-size:17px;margin:1.2em 0 .4em}
.sp-doc p{margin:0 0 .9em}
.sp-doc code{background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:2px 5px;font-size:.9em}
.sp-doc pre{background:var(--dsw-alias-bg-layer-2);padding:14px;border-radius:9px;overflow:auto}
.sp-doc table{border-collapse:collapse;width:100%;margin:1em 0}
.sp-doc th,.sp-doc td{border:1px solid var(--dsw-alias-border-l1);padding:8px 10px;text-align:left}
.sp-doc th{background:var(--dsw-alias-bg-layer-2)}
.sp-doc blockquote{border-left:3px solid var(--dsw-alias-border-l2);margin:1em 0;padding:.2em 0 .2em 1em;color:var(--dsw-alias-label-secondary)}
.sp-slides{width:100%;aspect-ratio:16/9;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:#fff}
.sp-table-wrap{max-width:100%;overflow:auto}
.sp-table{border-collapse:collapse;min-width:480px;width:100%}
.sp-table th,.sp-table td{border:1px solid var(--dsw-alias-border-l1);padding:7px 10px;text-align:left;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
.sp-table th{background:var(--dsw-alias-bg-layer-2);position:sticky;top:0}
.sp-muted{color:var(--dsw-alias-label-secondary);font-size:12px}
.sp-pre{white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-2);padding:14px;border-radius:9px}

.sp-badge{background:transparent;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.sp-tree-empty{margin:12px 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.7}
.sp-tree-empty span{color:var(--dsw-alias-label-secondary);opacity:.8}
.sp-conflict-banner{display:flex;align-items:center;gap:10px;padding:9px clamp(20px,3vw,36px);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 9%,var(--dsw-alias-bg-base));border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary) 30%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:12px}
.sp-conflict-banner span{flex:1}
.sp-content-inner{display:flex;flex-direction:column;min-height:100%;height:100%;gap:14px}
.sp-content-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.sp-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:140px}
.sp-content-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sp-dirty{font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.sp-seg{display:flex;padding:2px;background:var(--dsw-alias-bg-layer-2);border-radius:7px}
.sp-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:4px 9px;border-radius:5px;cursor:pointer}
.sp-seg button.active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.sp-editor{flex:1;min-height:360px;width:100%;box-sizing:border-box;resize:none;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:16px 18px;font:13px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;outline:none;tab-size:2}
.sp-editor:focus{border-color:var(--dsw-alias-brand-primary)}
.sp-table-edit td{padding:3px 4px}
.sp-cell-input{width:100%;min-width:90px;box-sizing:border-box;border:1px solid transparent;background:transparent;color:inherit;font:inherit;padding:5px 6px;border-radius:4px;outline:none}
.sp-cell-input:hover{border-color:var(--dsw-alias-border-l1)}
.sp-cell-input:focus{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.sp-table-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
.sp-dialog-wide{width:min(880px,100%)}
.sp-section-title{font-size:13px;margin:18px 0 8px;color:var(--dsw-alias-label-secondary);font-weight:600}
.sp-members{display:flex;flex-direction:column;gap:6px}
.sp-member{display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px}
.sp-member-name{font-weight:550;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-member-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-secondary);font-size:11px}
.sp-member .sp-muted{margin-left:auto}
.sp-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:0 0 auto}
.sp-dot.on{background:var(--dsw-alias-state-success-primary)}
.sp-sync-summary{display:flex;align-items:center;gap:10px;margin:14px 0 10px;flex-wrap:wrap}
.sp-conflict-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;margin-top:14px;min-height:320px}
.sp-conflict-list{display:flex;flex-direction:column;gap:5px;max-height:440px;overflow:auto;border-right:1px solid var(--dsw-alias-border-l1);padding-right:10px}
.sp-conflict-item{text-align:left;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 8px;font:inherit;font-size:12px;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.sp-conflict-item small{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-conflict-item:hover{background:var(--dsw-alias-bg-layer-2)}
.sp-conflict-item.active{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.sp-conflict-detail{min-width:0}
.sp-conflict-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sp-conflict-cols h4{margin:0 0 5px;font-size:11px;color:var(--dsw-alias-label-secondary);font-weight:600}
.sp-conflict-cols pre{height:260px;overflow:auto;margin:0;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);white-space:pre-wrap;word-break:break-word;font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
.sp-merged{max-height:220px;overflow:auto;margin-top:12px}
@media(max-width:900px){.sp-conflict-layout{grid-template-columns:1fr}.sp-conflict-list{max-height:140px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1);padding:0 0 10px}.sp-conflict-cols{grid-template-columns:1fr}.sp-conflict-cols pre{height:160px}}

.sp-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:24px;z-index:80}
.sp-dialog{width:min(520px,100%);max-height:min(86vh,720px);overflow:auto;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.28);outline:none}
.sp-dialog h2{margin:0 0 6px;font-size:19px}
.sp-field{display:flex;flex-direction:column;gap:6px;margin:14px 0;font-size:13px}
.sp-field span{color:var(--dsw-alias-label-secondary)}
.sp-field input,.sp-field select,.sp-field textarea{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font:inherit;outline:none}
.sp-field input:focus,.sp-field select:focus,.sp-field textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.sp-field textarea{resize:vertical;word-break:break-all}
.sp-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}
.sp-type{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.sp-type.active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.sp-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.sp-form-error{color:var(--dsw-alias-state-error-primary);font-size:12px;margin:8px 0 0}
.sp-error{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:10px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);padding:8px 12px;border-radius:9px;font-size:12px;max-width:80vw}
.sp-toast{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:90;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);padding:8px 14px;border-radius:999px;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
@media(max-width:820px){.sp-detail-body{grid-template-columns:1fr}.sp-tree{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1);max-height:220px}.sp-header{flex-direction:column}.sp-toolbar{align-items:stretch;flex-direction:column}.sp-search{min-width:0}}
`;
var name = "dsh-space-client";
var inject = ["slots"];
function apply(ctx) {
  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "spaces" }, App));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: "spaces",
    order: 20,
    label: () => "Spaces"
  }, function SpacesIcon({ size = 16 }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { name: "space", size });
  }));
}
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-shim.production.js:
  (**
   * @license React
   * use-sync-external-store-shim.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

    })(module, module.exports, require);
    return module.exports;
  },
});
