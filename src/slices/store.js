import { configureStore } from "@reduxjs/toolkit";
import noteSlice from "./noteSlice";
import sequencerSlice from "./sequencerSlice";

export const store = configureStore({
  reducer: {
    note: noteSlice,
    sequencer: sequencerSlice,
  },
});
