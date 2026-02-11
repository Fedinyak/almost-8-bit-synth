import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";
import noteSlice from "./noteSlice";
import sequencerSlice from "./sequencerSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    note: noteSlice,
    sequencer: sequencerSlice,
  },
});
