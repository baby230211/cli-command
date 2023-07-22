import * as fs from 'node:fs';
import * as path from 'node:path';
import inquirer from 'inquirer';
import FigmaImportLib, { IConfig } from '../lib/figma-import.lib';

function normalizeFolder(folder: string) {
  const fullPath = path.resolve(folder);
  // remove cwd from path and leading slash
  const normalized = fullPath.replace(process.cwd(), '').substring(1);
  return normalized;
}

let config: IConfig;
export default async function (args: string[]) {
  config = await inquirer.prompt<IConfig>([
    {
      type: 'input',
      name: 'figmaToken',
      message: 'Your Figma personal Token',
      validate(input) {
        return input === ''
          ? 'Generate a personal token for figma, read here:\nhttps://www.figma.com/developers/docs#authentication'
          : true;
      }
    },
    {
      type: 'input',
      name: 'fileId',
      message: 'What is the figma file ID?',
      validate(input) {
        return input === ''
          ? 'Visit figma project in the browser and copy the id:\nhttps://www.figma.com/file/{file_id}/project-name'
          : true;
      }
    },
    {
      type: 'input',
      name: 'canvas',
      message: 'Name of the page with icons?',
      validate(input) {
        return input === ''
          ? 'Visit figma project in the browser and get the name on the left panel'
          : true;
      }
    },
    {
      type: 'input',
      name: 'frame',
      message: 'Name of the frame with icons',
      validate(input) {
        return input === ''
          ? 'Visit figma project in the browser and get the frame name'
          : true;
      }
    }
  ]);
  const figmaImportLib = FigmaImportLib.getInstance(config);
  const icons = await figmaImportLib.getFigmaFile();
  if (icons?.length !== 0 && Array.isArray(icons)) {
    const chunkSize = 50;
    // chunk for 50 to avoid 413 too large response
    for (let i = 0; i < icons.length / chunkSize; i++) {
      await figmaImportLib.getImages(
        icons.slice(chunkSize * i, chunkSize * (i + 1))
      );
    }
    const outputPath = args[0];
    // remove cwd from path and leading slash
    const outputFolder = normalizeFolder(outputPath);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    icons.forEach(icon => {
      icon.path = `${outputFolder}/${icon.name}.svg`;
    });
    const success = await figmaImportLib.iterateIcons(icons);
    if (success) {
      console.log(`🟢 icon generated successfully to: ${outputFolder}`);
    }
  }
}
