import { useContext } from "preact/hooks";
import { BackendStatusContext } from "../context/BackendStatusContext";

export function useBackendStatus() {
  return useContext(BackendStatusContext);
}
