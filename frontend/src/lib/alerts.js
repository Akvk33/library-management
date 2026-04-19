import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#c76739",
  background: "#fffaf2",
  color: "#211b16"
};

export function showSuccess(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "success",
    title,
    text
  });
}

export function showError(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "error",
    title,
    text
  });
}

export function showInfo(title, text) {
  return Swal.fire({
    ...baseOptions,
    icon: "info",
    title,
    text
  });
}
