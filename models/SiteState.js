import mongoose from "../db.js";

const SiteStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.SiteState || mongoose.model("SiteState", SiteStateSchema);
