import '@testing-library/jest-dom';

// jsdom does not implement Element.prototype.scrollTo, which AIChat calls in an
// effect to auto-scroll the chat. Polyfill it so component tests exercise the
// real scroll logic without throwing. This does not change application behavior.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
