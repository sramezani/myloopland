/**
 * A problem the caller can fix, such as an unknown post id. Its message is plain words and is
 * shown as is: to Claude as a tool error, or on screen.
 */
export class UserFacingError extends Error {
  override name = "UserFacingError";
}
