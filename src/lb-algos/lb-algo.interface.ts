import { BackendServerDetails } from "../backend-server-details.ts";

export interface ILbAlgorithm {

    nextServer(): BackendServerDetails;
}