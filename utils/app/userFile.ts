interface ValidFileTypes {
  txt: boolean;
  pdf: boolean;
  docx: boolean;
  // Add more supported file types as needed
}

type ValidFileExtensions = "txt" | "pdf" | "docx";

type ValidFileLocations = 'local' | 'remote'

export class UserFileHandler {
  private fileData: Blob | string;
  private fileType: ValidFileExtensions | undefined;
  private fileLocation: ValidFileLocations;
  private validFileTypes: ValidFileTypes;

  constructor(fileData: Blob | string, validFileTypes: ValidFileTypes) {
    this.fileData = fileData;
    this.validFileTypes = validFileTypes;
    this.fileLocation = this.determineFileLocationType(fileData);
    this.fileType = this.determineFileType(fileData) as ValidFileExtensions;

    if (this.fileType && !this.validFileTypes[this.fileType]) {
      throw new Error(`Unsupported file type: ${this.fileType}`);
    }
  }

  private determineFileLocationType(fileData: Blob | string): ValidFileLocations {
    if (fileData instanceof Blob) {
      return 'local';
    } else if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
      return 'remote';
    } else {
      return 'local';
    }
  }

  private determineFileType(fileData: Blob | string): string | undefined {
    if (fileData instanceof Blob) {
      return fileData.type.split('/')[1];
    } else {
      const fileExtension = fileData.split('.').pop();
      return fileExtension;
    }
  }

  public async extractText(): Promise<string> {
    if (this.fileType && !this.validFileTypes[this.fileType]) {
      throw new Error(`Text extraction not supported for file type: ${this.fileType}`);
    }

    if (this.fileLocation === 'local') {
      if (this.fileData instanceof Blob) {
        return await this.fileData.text();
      } else {
        let txt = '';
        switch (this.fileType) {
          case 'txt':
            // Use appropriate library to read text file
            return txt;
          case 'pdf':
            // Use appropriate library to extract text from PDF
            return txt;
          case 'docx':
            // Use appropriate library to extract text from DOCX
            return txt;
          // Add more cases for other supported file types
        }
      }
    } else {
      const response = await fetch(this.fileData as string);
      const blob = await response.blob();
      let txt = '';

      switch (this.fileType) {
        case 'txt':
          return await blob.text();
        case 'pdf':
          // Use appropriate library to extract text from PDF
          return txt;
        case 'docx':
          // Use appropriate library to extract text from DOCX
          return txt;
        // Add more cases for other supported file types
      }
    }
    return '';
  }
}
