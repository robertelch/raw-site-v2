import JSZip from "jszip";
import { ResourceHandler } from "../resources.type";

export default class MagaPokeHandler implements ResourceHandler {
  url: URL;
  states: { name: string; percentage: number; }[];
  currentStateIndex: number;
  zipFile: JSZip;

  constructor(url: string) {
    this.url = new URL(url)

    this.states = [
      { name: 'Getting API data.', percentage: 0 },
      { name: 'Downloading', percentage: 0 },
    ]
    this.currentStateIndex = 0

    this.zipFile = new JSZip()
  }

  async execute(): Promise<JSZip> {
    
  }
}
