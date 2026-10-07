export type Gender = "male" | "female" | "other";

export type FamilyMember = {
  id: string;
  name: string;
  nickname?: string;
  gender?: Gender;
  birthDate?: string;
  deathDate?: string;
  photo?: string;
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  biography?: string;
  phone?: string;
  address?: string;
};

export type FamilyData = {
  version: 1;
  members: FamilyMember[];
};
