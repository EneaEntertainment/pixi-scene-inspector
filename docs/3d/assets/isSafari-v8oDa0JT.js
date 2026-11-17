import { D as DOMAdapter } from "./index-eueSuT0h.js";
function isSafari() {
  const { userAgent } = DOMAdapter.get().getNavigator();
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}
export {
  isSafari as i
};
