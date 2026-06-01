#include <StormLib.h>

#include <filesystem>
#include <iostream>
#include <string>

namespace fs = std::filesystem;

int main(int argc, char **argv) {
  if (argc < 4) {
    std::cerr << "Usage: extract-mpq-files <archive.w3x> <out-dir> <file> [file...]\n";
    return 2;
  }

  const char *archivePath = argv[1];
  const fs::path outDir = argv[2];
  fs::create_directories(outDir);

  HANDLE archive = nullptr;
  if (!SFileOpenArchive(archivePath, 0, MPQ_OPEN_READ_ONLY, &archive)) {
    std::cerr << "SFileOpenArchive failed for " << archivePath << "\n";
    return 1;
  }

  int failures = 0;
  for (int index = 3; index < argc; index += 1) {
    const std::string internalPath = argv[index];
    fs::path outputPath = outDir / fs::path(internalPath).filename();

    if (!SFileExtractFile(archive, internalPath.c_str(), outputPath.string().c_str(), SFILE_OPEN_FROM_MPQ)) {
      std::cerr << "missing " << internalPath << "\n";
      failures += 1;
      continue;
    }

    std::cout << outputPath << "\n";
  }

  SFileCloseArchive(archive);
  return failures ? 1 : 0;
}
