import { mockCreators } from "@creator/mock-data";

export const creatorOptions = mockCreators.map(({ profile }) => ({
  id: profile.id,
  name: profile.displayName,
  handle: profile.handle,
  domain: profile.domain,
  creatorType: profile.creatorType
}));

export const defaultCreatorId = creatorOptions[0]?.id ?? "short-drama-strategy";
