/** A photo attached to a SiteReport, once uploaded to Drive (site-report
 *  MVP). Independent from any salon domain type. */
export interface ReportPhoto {
  photoId: string;
  reportId: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
}
