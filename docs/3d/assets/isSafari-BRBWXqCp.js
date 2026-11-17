import { D as DOMAdapter } from "./index-I8-UpSZd.js";
function isSafari() {
  const { userAgent } = DOMAdapter.get().getNavigator();
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}
export {
  isSafari as i
};
