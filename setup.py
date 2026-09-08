from setuptools import setup, find_packages

setup(
    name="intim",
    version="0.1.0",
    description="Decentralized P2P GPU & VRAM Pooling Engine for High-Parameter LLMs",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Altrimic Team",
    url="https://github.com/altrimic/intim",
    packages=find_packages(),
    py_modules=["server", "worker"],
    entry_points={
        "console_scripts": [
            "intim-master=server:start_server",
            "intim-worker=worker:join_mesh",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
)
