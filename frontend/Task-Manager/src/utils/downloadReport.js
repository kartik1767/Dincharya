import toast from "react-hot-toast";
import axiosInstance from "./axiosInstance";

// Downloads an Excel report from the API and saves it with the filename the
// server sends (e.g. tasks_report_2026-10-23.xlsx).
export const downloadReport = async (url, fallbackFilename) => {
  try {
    const response = await axiosInstance.get(url, {
      params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      responseType: "blob",
      timeout: 60000, // big reports can take longer than the default 10s
    });

    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackFilename;

    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoking synchronously can cancel the download in some browsers
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

    toast.success("Report downloaded");
  } catch (error) {
    console.error("Error downloading report:", error);

    // With responseType "blob", the server's JSON error arrives as a Blob
    let message = "Failed to download report. Please try again.";
    const data = error.response?.data;
    if (data instanceof Blob) {
      try {
        message = JSON.parse(await data.text()).message || message;
      } catch {
        /* not JSON, keep default message */
      }
    }
    toast.error(message);
  }
};
