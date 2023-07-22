import axios, { AxiosError, AxiosInstance } from 'axios';
import chalk from 'chalk';
import * as fs from 'node:fs';
import ora from 'ora';

const figmaApiBase = 'https://api.figma.com/v1';
const spinner = ora();
export type IConfig = {
  figmaToken: string;
  fileId: string;
  canvas: string;
  frame: string;
};

type Icon = {
  id: string;
  name: string;
  image?: string;
  path?: string;
};

/**
 * Library for generating SVG from figma
 *
 * @author baby230211
 * @licence MIT
 */
class FigmaImportLib {
  static instance: FigmaImportLib;
  constructor(
    private readonly config: IConfig,
    private readonly figmaClient: AxiosInstance
  ) {}

  public static getInstance(config: IConfig) {
    if (!FigmaImportLib.instance) {
      const figmaClient = axios.create({
        baseURL: figmaApiBase
      });

      figmaClient.interceptors.request.use(conf => {
        conf.headers['X-Figma-Token'] = config.figmaToken;
        // @ts-ignore
        conf.startTime = new Date().getTime();
        return conf;
      });
      FigmaImportLib.instance = new FigmaImportLib(config, figmaClient);
    }

    return FigmaImportLib.instance;
  }

  /**
   * Removes fill and stroke attributes while preserving fill="none" to allow hollow elements
   * @param {string} svg - input SVG as string
   * @return {string} stripped SVG as string
   */
  stripProperties(svg: string) {
    const stripRe = new RegExp(' (stroke|fill)="((?!none).*?)"', 'igm');

    if (svg.match(stripRe)) {
      console.log('  and stripping following attributes', svg.match(stripRe));
    }

    return svg.replace(stripRe, '');
  }
  async getIconFromPath(icon: Icon): Promise<string | undefined> {
    try {
      const icon_svg = await axios
        .get(icon.image!, {
          headers: {
            'Content-Type': 'text/plain'
          }
        })
        .then(response => {
          return response.data;
        });
      return icon_svg;
    } catch (error) {
      console.log(
        chalk.red.bold(
          `Something went wrong fetching the image from S3, please try again ${error}`
        )
      );
    }
  }
  /**
   * Iterates the icons array, retrieves each image from s3 and create icon to outputPath
   * @param {Icon[]} icons - List containing file references and names
   * @param {function} [retrieveIconFn] - alternative retrieval function, default is getIconFromPath
   * @return {Promise} holding the iterate error if failed, true otherwise
   */
  async iterateIcons(icons: Icon[], retrieveIconFn = this.getIconFromPath) {
    try {
      const generateIconPromises = icons.map(icon => {
        return retrieveIconFn(icon).then((icon_svg: string | undefined) => {
          if (icon_svg && icon.path) {
            this.writeIconsToFile(icon.path, icon_svg);
          }
        });
      });
      await Promise.all(generateIconPromises);
      return true;
    } catch (error) {
      chalk.red.bold(`Something went wrong on iterating icons`);
      return false;
    }
  }
  /**
   * Writes the string into a folder
   * @param {string} fullFileName - folder and filename
   * @param {string} outputString - the output that should be written
   * @return {Promise} holding the write error if failed, true otherwise
   */
  writeIconsToFile(
    fullFileName: string,
    outputString: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.writeFile(fullFileName, outputString, 'utf8', err => {
        if (err) {
          reject(err);
        } else {
          console.log(
            chalk.cyan.bold(
              `Saved ${fullFileName}`
              // fs.statSync(fullFileName).size
            )
          );
          resolve(true);
        }
      });
    });
  }
  async getFigmaFile(): Promise<Icon[] | void> {
    spinner.start(
      'Fetching Figma file (this might take a while depending on the figma file size)'
    );
    try {
      const res = await this.figmaClient.get(`/files/${this.config.fileId}`);
      spinner.succeed();

      const endTime = new Date().getTime();

      console.log(
        chalk.cyan.bold(
          // @ts-ignore
          `Finished in ${(endTime - res.config.startTime) / 1000}s\n`
        )
      );
      const canvasPage = res.data.document.children.find(
        c => c.name === this.config.canvas
      );
      if (!canvasPage) {
        console.log(
          chalk.red.bold('Cannot find Icons Page, check your settings')
        );
        return;
      }

      const frameRoot = canvasPage.children.find(
        c => c.name === this.config.frame
      );
      if (!frameRoot) {
        console.log(
          chalk.red.bold(
            `Cannot find ${chalk.white.bgRed(
              this.config.frame
            )} Frame in the canvas, check your settings`
          )
        );
        return;
      }
      const iconsArray = frameRoot.children;

      const icons = iconsArray.map(icon => {
        return { id: icon.id, name: icon.name };
      });
      return icons;
    } catch (error) {
      if (error instanceof AxiosError) {
        spinner.fail();
        if (error.response) {
          console.log(
            chalk.red.bold(
              `Cannot get Figma file: ${error.response.data.status} ${error.response.data.err}`
            )
          );
        } else {
          console.log(error);
        }
      } else {
        throw error;
      }

      process.exit(1);
    }
  }

  getImages(icons: Array<Icon>): Promise<Array<Icon>> {
    return new Promise(resolve => {
      spinner.start('Fetching icon urls');
      const iconIds = icons.map(icon => icon.id).join(',');
      this.figmaClient
        .get(`/images/${this.config.fileId}?ids=${iconIds}&format=svg`)
        .then(res => {
          spinner.succeed();
          const images = res.data.images;
          icons.forEach(icon => {
            icon.image = images[icon.id];
          });
          resolve(icons);
        })
        .catch(err => {
          console.log('Cannot get icons: ', err);
          process.exit(1);
        });
    });
  }
}

export default FigmaImportLib;
