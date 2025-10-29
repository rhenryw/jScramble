# jScramble CLI

jScramble is a command-line interface (CLI) tool designed to obfuscate JSON data. It scrambles the content of JSON files using various techniques, including Unicode hashes, to ensure that the data remains readable by the program but is not easily understandable or editable by humans.

## Features

- Scrambles JSON data while maintaining its structure.
- Utilizes Unicode hashes and other obfuscation techniques.
- Easy to use from the command line.

## Installation

To install jScramble, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd jscramble-cli
npm install
```

## Usage

To use the jScramble CLI tool, run the following command:

```bash
bin/jscramble <path-to-json-file>
```

Replace `<path-to-json-file>` with the path to the JSON file you want to scramble.

## Example

```bash
bin/jscramble /path/to/test.json
```

This command will scramble the contents of `test.json` and output the obfuscated JSON data.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.