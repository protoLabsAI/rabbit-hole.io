/**
 * Not Found Page for Share Tokens
 *
 * Displayed when a share token doesn't exist in the database
 */

import { NotFoundError } from "@/components/share";

export default function NotFound() {
  return <NotFoundError />;
}
