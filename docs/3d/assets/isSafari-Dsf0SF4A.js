import { D as DOMAdapter } from "./index-Dm5hYZdW.js";
function isSafari() {
  const { userAgent } = DOMAdapter.get().getNavigator();
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}
export {
  isSafari as i
};
