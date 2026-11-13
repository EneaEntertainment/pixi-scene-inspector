import { D as DOMAdapter } from "./index-Deg-zCM_.js";
function isSafari() {
  const { userAgent } = DOMAdapter.get().getNavigator();
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}
export {
  isSafari as i
};
